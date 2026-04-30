import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Booking, BookingItem, Route, RouteStop, TrainSeat, Trip } from '../database/entities';
import { Repository } from 'typeorm';

export type TripSegmentResolution = {
  trip: Trip;
  route: Route;
  fromRouteStop: RouteStop;
  toRouteStop: RouteStop;
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
      })
      .orderBy('seat.car_number', 'ASC')
      .addOrderBy('seat.seat_number', 'ASC')
      .getMany();
  }
}
