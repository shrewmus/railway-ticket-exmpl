import { Booking } from './booking.entity';
import { RouteStop } from './route-stop.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, Index, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity({ name: 'stations' })
@Unique(['code'])
export class Station {
  @ApiProperty({
    format: 'uuid',
    example: '0b9f0bb2-4ec0-4ef9-95ef-5b2f5f6efcda',
  })
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ApiProperty({
    example: 'NUNN',
    description: 'Stable business code for the station.',
  })
  @Column({ type: 'varchar', length: 32 })
  @Index()
  code!: string;

  @ApiProperty({
    example: 'Nunningstone',
    description: 'Human-readable station name.',
  })
  @Column({ type: 'varchar', length: 255 })
  @Index()
  name!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-04-30T12:00:00.000Z',
  })
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
