import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Booking, BookingItem, TrainSeat, Trip } from '../database/entities';
import { In, Repository } from 'typeorm';
import { BookingCreatedDto } from './dto/booking-created.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { TripsService } from '../trips/trips.service';

export type BookingPriceCalculation = {
  tripId: string;
  fromStopOrder: number;
  toStopOrder: number;
  seatCount: number;
  segmentCount: number;
  pricePerSegment: number;
  pricePerSeat: number;
  totalPrice: number;
};

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(BookingItem)
    private readonly bookingItemRepository: Repository<BookingItem>,
    @InjectRepository(Trip)
    private readonly tripRepository: Repository<Trip>,
    @InjectRepository(TrainSeat)
    private readonly trainSeatRepository: Repository<TrainSeat>,
    private readonly tripsService: TripsService,
  ) {}

  async calculateBookingPrice(params: {
    tripId: string;
    fromStationId: string;
    toStationId: string;
    seatCount: number;
  }): Promise<BookingPriceCalculation> {
    const segment = await this.tripsService.resolveTripSegment(
      params.tripId,
      params.fromStationId,
      params.toStationId,
    );
    const trip = await this.tripRepository.findOne({
      where: { id: params.tripId },
    });

    if (!trip) {
      throw new NotFoundException(`Trip ${params.tripId} was not found`);
    }

    const segmentCount = segment.toStopOrder - segment.fromStopOrder;
    const pricePerSegment = Number(trip.pricePerSegment);
    const pricePerSeat = pricePerSegment * segmentCount;
    const totalPrice = pricePerSeat * params.seatCount;

    return {
      tripId: trip.id,
      fromStopOrder: segment.fromStopOrder,
      toStopOrder: segment.toStopOrder,
      seatCount: params.seatCount,
      segmentCount,
      pricePerSegment,
      pricePerSeat,
      totalPrice,
    };
  }

  async createBooking(dto: CreateBookingDto): Promise<BookingCreatedDto> {
    return this.bookingRepository.manager.transaction(async (manager) => {
      const tripRepository = manager.getRepository(Trip);
      const seatRepository = manager.getRepository(TrainSeat);
      const bookingRepository = manager.getRepository(Booking);
      const bookingItemRepository = manager.getRepository(BookingItem);

      const price = await this.calculateBookingPrice({
        tripId: dto.tripId,
        fromStationId: dto.fromStationId,
        toStationId: dto.toStationId,
        seatCount: dto.seatIds.length,
      });
      const trip = await tripRepository.findOne({
        where: { id: dto.tripId },
      });

      if (!trip) {
        throw new NotFoundException(`Trip ${dto.tripId} was not found`);
      }

      // Lock the requested seat rows before overlap checks so concurrent bookings for the same seat set cannot pass validation in parallel.
      const seats = await seatRepository
        .createQueryBuilder('seat')
        .setLock('pessimistic_write')
        .where('seat.id IN (:...seatIds)', {
          seatIds: dto.seatIds,
        })
        .andWhere('seat.train_id = :trainId', {
          trainId: trip.trainId,
        })
        .orderBy('seat.id', 'ASC')
        .getMany();

      if (seats.length !== dto.seatIds.length) {
        throw new BadRequestException(
          'One or more selected seats do not belong to the trip train',
        );
      }

      const conflictingSeatIds = await bookingItemRepository
        .createQueryBuilder('bookingItem')
        .innerJoin(
          Booking,
          'booking',
          'booking.id = bookingItem.booking_id',
        )
        .select('bookingItem.seat_id', 'seatId')
        .where('booking.trip_id = :tripId', {
          tripId: trip.id,
        })
        .andWhere('bookingItem.seat_id IN (:...seatIds)', {
          seatIds: dto.seatIds,
        })
        .andWhere('booking.from_stop_order < :toStopOrder', {
          toStopOrder: price.toStopOrder,
        })
        .andWhere('booking.to_stop_order > :fromStopOrder', {
          fromStopOrder: price.fromStopOrder,
        })
        .getRawMany<{ seatId: string }>();

      if (conflictingSeatIds.length > 0) {
        throw new ConflictException({
          message: 'One or more selected seats are no longer available',
          conflictingSeatIds: conflictingSeatIds.map(
            (conflict) => conflict.seatId,
          ),
        });
      }

      const booking = bookingRepository.create({
        tripId: trip.id,
        fromStationId: dto.fromStationId,
        toStationId: dto.toStationId,
        fromStopOrder: price.fromStopOrder,
        toStopOrder: price.toStopOrder,
        seatCount: dto.seatIds.length,
        priceTotal: price.totalPrice.toFixed(2),
        customerName: dto.customerName,
        documentNumber: dto.documentNumber,
        status: 'confirmed',
      });
      await bookingRepository.save(booking);

      const bookingItems = bookingItemRepository.create(
        dto.seatIds.map((seatId) => ({
          bookingId: booking.id,
          seatId,
          price: price.pricePerSeat.toFixed(2),
        })),
      );
      await bookingItemRepository.save(bookingItems);

      return {
        bookingId: booking.id,
        tripId: trip.id,
        seatCount: dto.seatIds.length,
        totalPrice: price.totalPrice.toFixed(2),
        seatIds: dto.seatIds,
      };
    });
  }
}
