import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Booking, BookingItem, Route, RouteStop, TrainSeat, Trip } from '../database/entities';
import { SelectQueryBuilder, Repository } from 'typeorm';
import { SearchTripResultDto } from './dto/search-trip-result.dto';
import { SearchTripsQueryDto } from './dto/search-trips-query.dto';

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
  serviceDate: string;
  fromStopOrder: number;
  toStopOrder: number;
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

    /*
      SELECT
        trip.id AS "tripId",
        trip.train_id AS "trainId",
        trip.route_id AS "routeId",
        trip.service_date AS "serviceDate",
        train.number AS "trainNumber",
        train.name AS "trainName",
        "fromStop".stop_order AS "fromStopOrder",
        "toStop".stop_order AS "toStopOrder"
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
        'train.number AS "trainNumber"',
        'train.name AS "trainName"',
        'fromStop.stop_order AS "fromStopOrder"',
        'toStop.stop_order AS "toStopOrder"',
      ])
      .orderBy('train.number', 'ASC')
      .getRawMany<SearchTripCandidate>();

    const matchingTrips = await Promise.all(
      candidates.map(async (candidate) => {
        const availableSeatCount = await this.countAvailableSeatsForSegment(
          candidate.tripId,
          query.fromStationId,
          query.toStationId,
        );

        if (availableSeatCount < query.seatCount) {
          return null;
        }

        return candidate;
      }),
    );

    return matchingTrips.filter(
      (candidate): candidate is SearchTripCandidate => candidate !== null,
    );
  }

  private buildAvailableSeatsQuery(
    segment: TripSegmentResolution,
  ): SelectQueryBuilder<TrainSeat> {
    return this.trainSeatRepository
      .createQueryBuilder('seat')
      .where('seat.train_id = :trainId', { trainId: segment.trip.trainId })
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
        tripId: segment.trip.id,
        fromStopOrder: segment.fromStopOrder,
        toStopOrder: segment.toStopOrder,
      });
  }
}
