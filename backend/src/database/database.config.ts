import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { databaseEntities } from './entities';

export const databaseConfig: TypeOrmModuleAsyncOptions = {
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    type: 'postgres',
    url:
      configService.get<string>('DATABASE_URL') ??
      'postgresql://postgres:postgres@localhost:5432/railway',
    entities: databaseEntities,
    synchronize: false,
  }),
};
