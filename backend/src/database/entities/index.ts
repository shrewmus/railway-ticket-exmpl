import { BookingItem } from './booking-item.entity';
import { Booking } from './booking.entity';
import { RouteStop } from './route-stop.entity';
import { Route } from './route.entity';
import { Station } from './station.entity';
import { TrainSeat } from './train-seat.entity';
import { Train } from './train.entity';
import { Trip } from './trip.entity';

export const databaseEntities = [
  Station,
  Train,
  TrainSeat,
  Route,
  RouteStop,
  Trip,
  Booking,
  BookingItem,
];

export {
  Booking,
  BookingItem,
  Route,
  RouteStop,
  Station,
  Train,
  TrainSeat,
  Trip,
};
