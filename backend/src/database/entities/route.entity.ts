import { RouteStop } from './route-stop.entity';
import { Trip } from './trip.entity';
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity({ name: 'routes' })
@Unique(['code'])
export class Route {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 32 })
  code!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name!: string | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @OneToMany(() => RouteStop, (routeStop) => routeStop.route)
  stops!: RouteStop[];

  @OneToMany(() => Trip, (trip) => trip.route)
  trips!: Trip[];
}
