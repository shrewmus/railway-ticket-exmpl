import { Booking } from './booking.entity';
import { Route } from './route.entity';
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

@Entity({ name: 'trips' })
@Unique(['trainId', 'routeId', 'serviceDate'])
@Check(`"price_per_segment" >= 0`)
export class Trip {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'train_id', type: 'uuid' })
  trainId!: string;

  @Column({ name: 'route_id', type: 'uuid' })
  @Index()
  routeId!: string;

  @Column({ name: 'service_date', type: 'date' })
  @Index()
  serviceDate!: string;

  @Column({ name: 'price_per_segment', type: 'numeric', precision: 10, scale: 2 })
  pricePerSegment!: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @ManyToOne(() => Train, (train) => train.trips, { nullable: false })
  @JoinColumn({ name: 'train_id' })
  train!: Train;

  @ManyToOne(() => Route, (route) => route.trips, { nullable: false })
  @JoinColumn({ name: 'route_id' })
  route!: Route;

  @OneToMany(() => Booking, (booking) => booking.trip)
  bookings!: Booking[];
}
