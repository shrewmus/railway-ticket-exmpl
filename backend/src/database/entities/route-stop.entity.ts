import { Route } from './route.entity';
import { Station } from './station.entity';
import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity({ name: 'route_stops' })
@Unique(['routeId', 'stopOrder'])
@Unique(['routeId', 'stationId'])
@Index(['routeId', 'stationId', 'stopOrder'])
@Check(`"stop_order" > 0`)
@Check(`"default_arrival_offset_minutes" IS NULL OR "default_arrival_offset_minutes" >= 0`)
@Check(`"default_departure_offset_minutes" IS NULL OR "default_departure_offset_minutes" >= 0`)
export class RouteStop {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'route_id', type: 'uuid' })
  @Index()
  routeId!: string;

  @Column({ name: 'station_id', type: 'uuid' })
  @Index()
  stationId!: string;

  @Column({ name: 'stop_order', type: 'integer' })
  stopOrder!: number;

  @Column({
    name: 'default_arrival_offset_minutes',
    type: 'integer',
    nullable: true,
  })
  defaultArrivalOffsetMinutes!: number | null;

  @Column({
    name: 'default_departure_offset_minutes',
    type: 'integer',
    nullable: true,
  })
  defaultDepartureOffsetMinutes!: number | null;

  @ManyToOne(() => Route, (route) => route.stops, { nullable: false })
  @JoinColumn({ name: 'route_id' })
  route!: Route;

  @ManyToOne(() => Station, (station) => station.routeStops, { nullable: false })
  @JoinColumn({ name: 'station_id' })
  station!: Station;
}
