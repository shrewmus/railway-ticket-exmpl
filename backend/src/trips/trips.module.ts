import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Booking,
  BookingItem,
  Route,
  RouteStop,
  Station,
  TrainSeat,
  Trip,
} from '../database/entities';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Trip,
      Route,
      RouteStop,
      Station,
      TrainSeat,
      Booking,
      BookingItem,
    ]),
  ],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
