import { Booking } from './booking.entity';
import { TrainSeat } from './train-seat.entity';
import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity({ name: 'booking_items' })
@Unique(['bookingId', 'seatId'])
@Check(`"price" >= 0`)
export class BookingItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  bookingId!: string;

  @Column({ name: 'seat_id', type: 'uuid' })
  @Index()
  seatId!: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  price!: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @ManyToOne(() => Booking, (booking) => booking.items, { nullable: false })
  @JoinColumn({ name: 'booking_id' })
  booking!: Booking;

  @ManyToOne(() => TrainSeat, (seat) => seat.bookingItems, { nullable: false })
  @JoinColumn({ name: 'seat_id' })
  seat!: TrainSeat;
}
