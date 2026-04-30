import { Booking } from './booking.entity';
import { RouteStop } from './route-stop.entity';
import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity({ name: 'stations' })
@Unique(['code'])
export class Station {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 32 })
  @Index()
  code!: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  name!: string;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @OneToMany(() => RouteStop, (routeStop) => routeStop.station)
  routeStops!: RouteStop[];

  @OneToMany(() => Booking, (booking) => booking.fromStation)
  departureBookings!: Booking[];

  @OneToMany(() => Booking, (booking) => booking.toStation)
  arrivalBookings!: Booking[];
}
