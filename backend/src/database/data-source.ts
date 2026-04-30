import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { databaseEntities } from './entities';

const appDataSource = new DataSource({
  type: 'postgres',
  url:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/railway',
  entities: databaseEntities,
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});

export default appDataSource;
