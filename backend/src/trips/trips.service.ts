import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Booking,
  BookingItem,
  Route,
  RouteStop,
  Station,
  TrainSeat,
  Trip,
} from '../database/entities';
import { SelectQueryBuilder, Repository } from 'typeorm';
import { SearchTripResultDto } from './dto/search-trip-result.dto';
import { SearchTripsQueryDto } from './dto/search-trips-query.dto';
import { TripDetailsDto } from './dto/trip-details.dto';
import { TripRouteStopDto } from './dto/trip-route-stop.dto';
import { TripSeatDto } from './dto/trip-seat.dto';
import { TripSegmentQueryDto } from './dto/trip-segment-query.dto';

export type TripSegmentResolution = {
  trip: Trip;
  route: Route;
  fromRouteStop: RouteStop;
  toRouteStop: RouteStop;
  fromStopOrder: number;
  toStopOrder: number;
};

type SearchTripCandidate = {
  tripId: string;
  trainId: string;
  trainNumber: string;
  trainName: string | null;
  routeId: string;
  serviceDate: string | Date;
  fromStopOrder: number;
  toStopOrder: number;
  fromDepartureOffsetMinutes: number | null;
  fromArrivalOffsetMinutes: number | null;
  toArrivalOffsetMinutes: number | null;
  toDepartureOffsetMinutes: number | null;
  pricePerSegment: string;
};

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip)
    private readonly tripRepository: Repository<Trip>,
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
    @InjectRepository(RouteStop)
    private readonly routeStopRepository: Repository<RouteStop>,
    @InjectRepository(Station)
    private readonly stationRepository: Repository<Station>,
    @InjectRepository(TrainSeat)
    private readonly trainSeatRepository: Repository<TrainSeat>,
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(BookingItem)
    private readonly bookingItemRepository: Repository<BookingItem>,
  ) {}

  async findTripOrFail(tripId: string) {
    const trip = await this.tripRepository.findOne({
      where: { id: tripId },
      relations: {
        route: true,
      },
    });

    if (!trip) {
      throw new NotFoundException(`Trip ${tripId} was not found`);
    }

    return trip;
  }

  async getOrderedRouteStops(routeId: string) {
    return this.routeStopRepository.find({
      where: { routeId },
      relations: {
        station: true,
      },
      order: {
        stopOrder: 'ASC',
      },
    });
  }

  async resolveTripSegment(
    tripId: string,
    fromStationId: string,
    toStationId: string,
  ): Promise<TripSegmentResolution> {
    if (fromStationId === toStationId) {
      throw new BadRequestException(
        'Departure and arrival stations must be different',
      );
    }

    const trip = await this.findTripOrFail(tripId);
    const route = trip.route;

    const routeStops = await this.routeStopRepository.find({
      where: [
        { routeId: route.id, stationId: fromStationId },
        { routeId: route.id, stationId: toStationId },
      ],
      order: {
        stopOrder: 'ASC',
      },
    });

    const fromRouteStop = routeStops.find(
      (routeStop) => routeStop.stationId === fromStationId,
    );
    const toRouteStop = routeStops.find(
      (routeStop) => routeStop.stationId === toStationId,
    );

    if (!fromRouteStop) {
      throw new NotFoundException(
        `Station ${fromStationId} is not part of trip ${tripId}`,
      );
    }

    if (!toRouteStop) {
      throw new NotFoundException(
        `Station ${toStationId} is not part of trip ${tripId}`,
      );
    }

    if (fromRouteStop.stopOrder >= toRouteStop.stopOrder) {
      throw new BadRequestException(
        'Departure station must come before arrival station on the trip route',
      );
    }

    return {
      trip,
      route,
      fromRouteStop,
      toRouteStop,
      fromStopOrder: fromRouteStop.stopOrder,
      toStopOrder: toRouteStop.stopOrder,
    };
  }

  async findAvailableSeatsForSegment(
    tripId: string,
    fromStationId: string,
    toStationId: string,
  ) {
    const segment = await this.resolveTripSegment(
      tripId,
      fromStationId,
      toStationId,
    );

    return this.buildAvailableSeatsQuery(segment)
      .orderBy('seat.car_number', 'ASC')
      .addOrderBy('seat.seat_number', 'ASC')
      .getMany();
  }

  async countAvailableSeatsForSegment(
    tripId: string,
    fromStationId: string,
    toStationId: string,
  ) {
    const segment = await this.resolveTripSegment(
      tripId,
      fromStationId,
      toStationId,
    );

    return this.buildAvailableSeatsQuery(segment).getCount();
  }

  async searchTrips(query: SearchTripsQueryDto): Promise<SearchTripResultDto[]> {
    if (query.fromStationId === query.toStationId) {
      throw new BadRequestException(
        'Departure and arrival stations must be different',
      );
    }

    await this.ensureStationsExist(
      query.fromStationId,
      query.toStationId,
    );

    /*
      SELECT
        trip.id AS "tripId",
        trip.train_id AS "trainId",
        trip.route_id AS "routeId",
        trip.service_date AS "serviceDate",
        trip.price_per_segment AS "pricePerSegment",
        train.number AS "trainNumber",
        train.name AS "trainName",
        "fromStop".stop_order AS "fromStopOrder",
        "toStop".stop_order AS "toStopOrder",
        "fromStop".default_departure_offset_minutes AS "fromDepartureOffsetMinutes",
        "fromStop".default_arrival_offset_minutes AS "fromArrivalOffsetMinutes",
        "toStop".default_arrival_offset_minutes AS "toArrivalOffsetMinutes",
        "toStop".default_departure_offset_minutes AS "toDepartureOffsetMinutes"
        FROM trips trip
          INNER JOIN trains train ON train.id = trip.train_id
          INNER JOIN route_stops "fromStop"  ON "fromStop".route_id = trip.route_id  AND "fromStop".station_id = :fromStationId
          INNER JOIN route_stops "toStop"  ON "toStop".route_id = trip.route_id  AND "toStop".station_id = :toStationId
        WHERE trip.service_date = :serviceDate
          AND "fromStop".stop_order < "toStop".stop_order
        ORDER BY train.number ASC;
     */

    const candidates = await this.tripRepository
      .createQueryBuilder('trip')
      .innerJoin('trip.train', 'train')
      .innerJoin(
        RouteStop,
        'fromStop',
        'fromStop.route_id = trip.route_id AND fromStop.station_id = :fromStationId',
        { fromStationId: query.fromStationId },
      )
      .innerJoin(
        RouteStop,
        'toStop',
        'toStop.route_id = trip.route_id AND toStop.station_id = :toStationId',
        { toStationId: query.toStationId },
      )
      .where('trip.service_date = :serviceDate', {
        serviceDate: query.serviceDate,
      })
      .andWhere('fromStop.stop_order < toStop.stop_order')
      .select([
        'trip.id AS "tripId"',
        'trip.train_id AS "trainId"',
        'trip.route_id AS "routeId"',
        'trip.service_date AS "serviceDate"',
        'trip.price_per_segment AS "pricePerSegment"',
        'train.number AS "trainNumber"',
        'train.name AS "trainName"',
        'fromStop.stop_order AS "fromStopOrder"',
        'toStop.stop_order AS "toStopOrder"',
        'fromStop.default_departure_offset_minutes AS "fromDepartureOffsetMinutes"',
        'fromStop.default_arrival_offset_minutes AS "fromArrivalOffsetMinutes"',
        'toStop.default_arrival_offset_minutes AS "toArrivalOffsetMinutes"',
        'toStop.default_departure_offset_minutes AS "toDepartureOffsetMinutes"',
      ])
      .orderBy('train.number', 'ASC')
      .getRawMany<SearchTripCandidate>();

    const matchingTrips = await Promise.all(
      candidates.map(async (candidate) => {
        const availableSeatCount = await this.countAvailableSeatsByOrders(
          candidate.trainId,
          candidate.tripId,
          candidate.fromStopOrder,
          candidate.toStopOrder,
        );

        if (availableSeatCount < query.seatCount) {
          return null;
        }

        const segmentCount = candidate.toStopOrder - candidate.fromStopOrder;
        const pricePerSeat = Number(candidate.pricePerSegment) * segmentCount;
        const totalPrice = pricePerSeat * query.seatCount;
        const departureOffsetMinutes =
          candidate.fromDepartureOffsetMinutes ??
          candidate.fromArrivalOffsetMinutes;
        const arrivalOffsetMinutes =
          candidate.toArrivalOffsetMinutes ?? candidate.toDepartureOffsetMinutes;

        if (
          departureOffsetMinutes === null ||
          arrivalOffsetMinutes === null
        ) {
          throw new BadRequestException(
            `Trip ${candidate.tripId} has incomplete route timing data`,
          );
        }

        return {
          tripId: candidate.tripId,
          trainId: candidate.trainId,
          trainNumber: candidate.trainNumber,
          trainName: candidate.trainName,
          routeId: candidate.routeId,
          serviceDate: candidate.serviceDate,
          departureTime: this.buildTripDateTime(
            candidate.serviceDate,
            departureOffsetMinutes,
          ),
          arrivalTime: this.buildTripDateTime(
            candidate.serviceDate,
            arrivalOffsetMinutes,
          ),
          fromStopOrder: candidate.fromStopOrder,
          toStopOrder: candidate.toStopOrder,
          availableSeatCount,
          pricePerSeat,
          totalPrice,
        };
      }),
    );

    return matchingTrips.filter(
      (candidate): candidate is SearchTripResultDto => candidate !== null,
    );
  }

  async getTripDetails(
    tripId: string,
    query: TripSegmentQueryDto,
  ): Promise<TripDetailsDto> {
    const segment = await this.resolveTripSegment(
      tripId,
      query.fromStationId,
      query.toStationId,
    );
    const trip = await this.tripRepository.findOne({
      where: { id: tripId },
      relations: {
        train: true,
        route: true,
      },
    });

    if (!trip) {
      throw new NotFoundException(`Trip ${tripId} was not found`);
    }

    const routeStops = await this.getOrderedRouteStops(segment.route.id);
    const segmentCount = segment.toStopOrder - segment.fromStopOrder;
    const pricePerSeat = Number(trip.pricePerSegment) * segmentCount;
    const fromStopDetails = routeStops.find(
      (routeStop) => routeStop.stationId === segment.fromRouteStop.stationId,
    );
    const toStopDetails = routeStops.find(
      (routeStop) => routeStop.stationId === segment.toRouteStop.stationId,
    );

    if (!fromStopDetails || !toStopDetails) {
      throw new NotFoundException(
        `Selected segment stations are not part of trip ${tripId}`,
      );
    }

    // note: Her for MVP example use plain object assignment
    // exists more ways to make code more readable but for now this is ok
    // e.g. - using class-transform (plainToInstance), create more complex dto class with transformation methods, create special trasnform functions etc

    return {
      tripId: trip.id,
      trainId: trip.trainId,
      trainNumber: trip.train.number,
      trainName: trip.train.name,
      routeId: trip.routeId,
      routeCode: trip.route.code,
      routeName: trip.route.name,
      serviceDate: trip.serviceDate,
      pricePerSegment: Number(trip.pricePerSegment),
      selectedSegment: {
        fromStationId: fromStopDetails.stationId,
        fromStationCode: fromStopDetails.station.code,
        fromStationName: fromStopDetails.station.name,
        toStationId: toStopDetails.stationId,
        toStationCode: toStopDetails.station.code,
        toStationName: toStopDetails.station.name,
        fromStopOrder: segment.fromStopOrder,
        toStopOrder: segment.toStopOrder,
        segmentCount,
        departureTime: this.buildStopDepartureTime(
          trip.serviceDate,
          fromStopDetails,
        ),
        arrivalTime: this.buildStopArrivalTime(
          trip.serviceDate,
          toStopDetails,
        ),
        pricePerSeat,
      },
      routeStops: routeStops.map((routeStop): TripRouteStopDto => ({
        stationId: routeStop.stationId,
        stationCode: routeStop.station.code,
        stationName: routeStop.station.name,
        stopOrder: routeStop.stopOrder,
        arrivalTime:
          routeStop.defaultArrivalOffsetMinutes === null
            ? null
            : this.buildTripDateTime(
                trip.serviceDate,
                routeStop.defaultArrivalOffsetMinutes,
              ),
        departureTime:
          routeStop.defaultDepartureOffsetMinutes === null
            ? null
            : this.buildTripDateTime(
                trip.serviceDate,
                routeStop.defaultDepartureOffsetMinutes,
              ),
        isSelectedFrom: routeStop.stopOrder === segment.fromStopOrder,
        isSelectedTo: routeStop.stopOrder === segment.toStopOrder,
        isWithinSelectedSegment:
          routeStop.stopOrder >= segment.fromStopOrder &&
          routeStop.stopOrder <= segment.toStopOrder,
        isDepartureLegSelected:
          routeStop.stopOrder >= segment.fromStopOrder &&
          routeStop.stopOrder < segment.toStopOrder,
      })),
    };
  }

  async getAvailableSeats(
    tripId: string,
    query: TripSegmentQueryDto,
  ): Promise<TripSeatDto[]> {
    const seats = await this.findAvailableSeatsForSegment(
      tripId,
      query.fromStationId,
      query.toStationId,
    );

    return seats.map((seat) => ({
      seatId: seat.id,
      carNumber: seat.carNumber,
      seatNumber: seat.seatNumber,
      label: `${seat.carNumber}/${seat.seatNumber}`,
    }));
  }

  private buildAvailableSeatsQuery(
    segment: TripSegmentResolution,
  ): SelectQueryBuilder<TrainSeat> {
    return this.buildAvailableSeatsByOrdersQuery(
      segment.trip.trainId,
      segment.trip.id,
      segment.fromStopOrder,
      segment.toStopOrder,
    );
  }

  private buildAvailableSeatsByOrdersQuery(
    trainId: string,
    tripId: string,
    fromStopOrder: number,
    toStopOrder: number,
  ): SelectQueryBuilder<TrainSeat> {
    return this.trainSeatRepository
      .createQueryBuilder('seat')
      .where('seat.train_id = :trainId', { trainId })
      .andWhere((queryBuilder) => {
        const overlappingSeatSubquery = queryBuilder
          .subQuery()
          .select('bookingItem.seat_id')
          .from(BookingItem, 'bookingItem')
          .innerJoin(Booking, 'booking', 'booking.id = bookingItem.booking_id')
          .where('booking.trip_id = :tripId')
          .andWhere('booking.from_stop_order < :toStopOrder')
          .andWhere('booking.to_stop_order > :fromStopOrder')
          .getQuery();

        return `seat.id NOT IN ${overlappingSeatSubquery}`;
      })
      .setParameters({
        tripId,
        fromStopOrder,
        toStopOrder,
      });
  }

  private countAvailableSeatsByOrders(
    trainId: string,
    tripId: string,
    fromStopOrder: number,
    toStopOrder: number,
  ) {
    return this.buildAvailableSeatsByOrdersQuery(
      trainId,
      tripId,
      fromStopOrder,
      toStopOrder,
    ).getCount();
  }

  private buildTripDateTime(
    serviceDate: string | Date,
    offsetMinutes: number,
  ) {
    const date = this.buildServiceDateBase(serviceDate);
    date.setUTCMinutes(date.getUTCMinutes() + offsetMinutes);

    return date.toISOString();
  }

  private buildServiceDateBase(serviceDate: string | Date) {
    if (serviceDate instanceof Date) {
      const timestamp = serviceDate.getTime();

      if (Number.isNaN(timestamp)) {
        throw new BadRequestException('Trip service date is invalid');
      }

      return new Date(
        Date.UTC(
          serviceDate.getUTCFullYear(),
          serviceDate.getUTCMonth(),
          serviceDate.getUTCDate(),
        ),
      );
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) {
      return new Date(`${serviceDate}T00:00:00.000Z`);
    }

    const parsedDate = new Date(serviceDate);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Trip service date is invalid');
    }

    return new Date(
      Date.UTC(
        parsedDate.getUTCFullYear(),
        parsedDate.getUTCMonth(),
        parsedDate.getUTCDate(),
      ),
    );
  }

  private buildStopArrivalTime(serviceDate: string, routeStop: RouteStop) {
    const offsetMinutes =
      routeStop.defaultArrivalOffsetMinutes ??
      routeStop.defaultDepartureOffsetMinutes;

    if (offsetMinutes === null) {
      throw new BadRequestException(
        `Route stop ${routeStop.id} does not have timing data`,
      );
    }

    return this.buildTripDateTime(serviceDate, offsetMinutes);
  }

  private buildStopDepartureTime(serviceDate: string, routeStop: RouteStop) {
    const offsetMinutes =
      routeStop.defaultDepartureOffsetMinutes ??
      routeStop.defaultArrivalOffsetMinutes;

    if (offsetMinutes === null) {
      throw new BadRequestException(
        `Route stop ${routeStop.id} does not have timing data`,
      );
    }

    return this.buildTripDateTime(serviceDate, offsetMinutes);
  }

  private async ensureStationsExist(
    fromStationId: string,
    toStationId: string,
  ) {
    const stations = await this.stationRepository.find({
      where: [{ id: fromStationId }, { id: toStationId }],
      select: {
        id: true,
      },
    });
    const stationIds = new Set(stations.map((station) => station.id));

    if (!stationIds.has(fromStationId)) {
      throw new NotFoundException(
        `Station ${fromStationId} was not found`,
      );
    }

    if (!stationIds.has(toStationId)) {
      throw new NotFoundException(
        `Station ${toStationId} was not found`,
      );
    }
  }
}
