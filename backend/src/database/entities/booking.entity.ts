import { BookingItem } from './booking-item.entity';
import { Station } from './station.entity';
import { Trip } from './trip.entity';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'bookings' })
@Index(['tripId', 'fromStopOrder', 'toStopOrder'])
@Check(`"seat_count" BETWEEN 1 AND 5`)
@Check(`"from_stop_order" > 0`)
@Check(`"to_stop_order" > 0`)
@Check(`"from_stop_order" < "to_stop_order"`)
@Check(`"price_total" >= 0`)
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'trip_id', type: 'uuid' })
  @Index()
  tripId!: string;

  @Column({ name: 'from_station_id', type: 'uuid' })
  fromStationId!: string;

  @Column({ name: 'to_station_id', type: 'uuid' })
  toStationId!: string;

  @Column({ name: 'from_stop_order', type: 'integer' })
  fromStopOrder!: number;

  @Column({ name: 'to_stop_order', type: 'integer' })
  toStopOrder!: number;

  @Column({ name: 'seat_count', type: 'smallint' })
  seatCount!: number;

  @Column({ name: 'price_total', type: 'numeric', precision: 10, scale: 2 })
  priceTotal!: string;

  @Column({ name: 'customer_name', type: 'varchar', length: 255 })
  customerName!: string;

  @Column({ name: 'document_number', type: 'varchar', length: 128 })
  documentNumber!: string;

  @Column({ type: 'varchar', length: 32, default: 'confirmed' })
  status!: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  @Index()
  createdAt!: Date;

  @ManyToOne(() => Trip, (trip) => trip.bookings, { nullable: false })
  @JoinColumn({ name: 'trip_id' })
  trip!: Trip;

  @ManyToOne(() => Station, (station) => station.departureBookings, { nullable: false })
  @JoinColumn({ name: 'from_station_id' })
  fromStation!: Station;

  @ManyToOne(() => Station, (station) => station.arrivalBookings, { nullable: false })
  @JoinColumn({ name: 'to_station_id' })
  toStation!: Station;

  @OneToMany(() => BookingItem, (bookingItem) => bookingItem.booking)
  items!: BookingItem[];
}
