import { ApiProperty } from '@nestjs/swagger';

export class TripRouteStopDto {
  @ApiProperty({
    format: 'uuid',
    example: '53c4b7c8-9933-498a-a4e9-1778d6d49fb7',
  })
  stationId!: string;

  @ApiProperty({
    example: 'NUNN',
  })
  stationCode!: string;

  @ApiProperty({
    example: 'Nunningstone',
  })
  stationName!: string;

  @ApiProperty({
    example: 1,
  })
  stopOrder!: number;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    example: null,
  })
  arrivalTime!: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    example: '2026-05-10T00:00:00.000Z',
  })
  departureTime!: string | null;

  @ApiProperty({
    example: false,
    description: 'True when this stop is the departure boundary of the selected segment.',
  })
  isSelectedFrom!: boolean;

  @ApiProperty({
    example: false,
    description: 'True when this stop is the arrival boundary of the selected segment.',
  })
  isSelectedTo!: boolean;

  @ApiProperty({
    example: false,
    description: 'True when this stop lies inside the selected segment, including its boundaries.',
  })
  isWithinSelectedSegment!: boolean;

  @ApiProperty({
    example: false,
    description: 'True when the outgoing leg that starts at this stop belongs to the selected segment.',
  })
  isDepartureLegSelected!: boolean;
}
