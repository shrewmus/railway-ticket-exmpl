import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsInt, IsUUID, Max, Min } from 'class-validator';

export class SearchTripsQueryDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Departure station identifier.',
    example: '0b9f0bb2-4ec0-4ef9-95ef-5b2f5f6efcda',
  })
  @IsUUID('4')
  fromStationId!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Arrival station identifier.',
    example: '3a9ed6bc-81df-4f76-90c9-d41ca7d6c912',
  })
  @IsUUID('4')
  toStationId!: string;

  @ApiProperty({
    format: 'date',
    description: 'Trip service date in YYYY-MM-DD format.',
    example: '2026-05-10',
  })
  @IsDateString()
  serviceDate!: string;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 5,
    default: 1,
    description: 'Requested number of seats for the trip segment.',
    example: 2,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  seatCount: number = 1;
}
