import { BookingItem } from './booking-item.entity';
import { Train } from './train.entity';
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
  Unique,
} from 'typeorm';

@Entity({ name: 'train_seats' })
@Unique(['trainId', 'carNumber', 'seatNumber'])
@Check(`"car_number" > 0`)
export class TrainSeat {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'train_id', type: 'uuid' })
  @Index()
  trainId!: string;

  @Column({ name: 'car_number', type: 'smallint' })
  carNumber!: number;

  @Column({ name: 'seat_number', type: 'varchar', length: 32 })
  seatNumber!: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @ManyToOne(() => Train, (train) => train.seats, { nullable: false })
  @JoinColumn({ name: 'train_id' })
  train!: Train;

  @OneToMany(() => BookingItem, (bookingItem) => bookingItem.seat)
  bookingItems!: BookingItem[];
}
