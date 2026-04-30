import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Booking, BookingItem, TrainSeat, Trip } from '../database/entities';
import { Repository } from 'typeorm';
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
}
