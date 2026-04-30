import { ApiProperty } from '@nestjs/swagger';

export class TripSegmentSummaryDto {
  @ApiProperty({
    format: 'uuid',
    example: '53c4b7c8-9933-498a-a4e9-1778d6d49fb7',
  })
  fromStationId!: string;

  @ApiProperty({
    example: 'NUNN',
  })
  fromStationCode!: string;

  @ApiProperty({
    example: 'Nunningstone',
  })
  fromStationName!: string;

  @ApiProperty({
    format: 'uuid',
    example: 'f7850da6-47c8-4068-a92f-9510f8b34f65',
  })
  toStationId!: string;

  @ApiProperty({
    example: 'WRUT',
  })
  toStationCode!: string;

  @ApiProperty({
    example: 'Wruthill City',
  })
  toStationName!: string;

  @ApiProperty({
    example: 1,
  })
  fromStopOrder!: number;

  @ApiProperty({
    example: 4,
  })
  toStopOrder!: number;

  @ApiProperty({
    example: 3,
  })
  segmentCount!: number;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-05-10T00:00:00.000Z',
  })
  departureTime!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-05-10T02:25:00.000Z',
  })
  arrivalTime!: string;

  @ApiProperty({
    type: Number,
    example: 60,
  })
  pricePerSeat!: number;
}
