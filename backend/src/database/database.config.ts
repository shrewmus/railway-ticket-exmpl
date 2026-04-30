import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';

export const databaseConfig: TypeOrmModuleAsyncOptions = {
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    type: 'postgres',
    url:
      configService.get<string>('DATABASE_URL') ??
      'postgresql://postgres:postgres@localhost:5432/railway',
    autoLoadEntities: true,
    synchronize: false,
  }),
};
