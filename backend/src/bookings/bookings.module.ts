import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking, BookingItem, TrainSeat, Trip } from '../database/entities';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { TripsModule } from '../trips/trips.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, BookingItem, Trip, TrainSeat]),
    TripsModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
