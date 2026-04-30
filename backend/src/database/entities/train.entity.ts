import { TrainSeat } from './train-seat.entity';
import { Trip } from './trip.entity';
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity({ name: 'trains' })
@Unique(['number'])
export class Train {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 32 })
  number!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name!: string | null;

  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt!: Date;

  @OneToMany(() => TrainSeat, (trainSeat) => trainSeat.train)
  seats!: TrainSeat[];

  @OneToMany(() => Trip, (trip) => trip.train)
  trips!: Trip[];
}
