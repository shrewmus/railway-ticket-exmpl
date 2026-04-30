import { ApiProperty } from '@nestjs/swagger';
import { TripRouteStopDto } from './trip-route-stop.dto';
import { TripSegmentSummaryDto } from './trip-segment-summary.dto';

export class TripDetailsDto {
  @ApiProperty({
    format: 'uuid',
    example: 'b32c8e55-42da-47d6-9439-39eb71ae93c5',
  })
  tripId!: string;

  @ApiProperty({
    format: 'uuid',
    example: '0f92dba4-f2c7-49c8-b1bb-e383679fe2b1',
  })
  trainId!: string;

  @ApiProperty({
    example: 'IC-101',
  })
  trainNumber!: string;

  @ApiProperty({
    example: 'Intercity North',
    nullable: true,
  })
  trainName!: string | null;

  @ApiProperty({
    format: 'uuid',
    example: '2b3b4ec8-4c75-4fe7-8b89-0fe0d86dad78',
  })
  routeId!: string;

  @ApiProperty({
    example: 'R1',
  })
  routeCode!: string;

  @ApiProperty({
    example: 'Nunningstone to Peningwell',
    nullable: true,
  })
  routeName!: string | null;

  @ApiProperty({
    format: 'date',
    example: '2026-05-10',
  })
  serviceDate!: string;

  @ApiProperty({
    type: Number,
    example: 20,
  })
  pricePerSegment!: number;

  @ApiProperty({
    type: () => TripSegmentSummaryDto,
  })
  selectedSegment!: TripSegmentSummaryDto;

  @ApiProperty({
    type: () => TripRouteStopDto,
    isArray: true,
  })
  routeStops!: TripRouteStopDto[];
}
