import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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

      const seats = await seatRepository.find({
        where: {
          id: In(dto.seatIds),
          trainId: trip.trainId,
        },
      });

      if (seats.length !== dto.seatIds.length) {
        throw new BadRequestException(
          'One or more selected seats do not belong to the trip train',
        );
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
