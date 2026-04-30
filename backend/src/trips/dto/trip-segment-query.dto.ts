import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TripSegmentQueryDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Departure station identifier for the selected trip segment.',
    example: '0b9f0bb2-4ec0-4ef9-95ef-5b2f5f6efcda',
  })
  @IsUUID('4')
  fromStationId!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Arrival station identifier for the selected trip segment.',
    example: '3a9ed6bc-81df-4f76-90c9-d41ca7d6c912',
  })
  @IsUUID('4')
  toStationId!: string;
}
