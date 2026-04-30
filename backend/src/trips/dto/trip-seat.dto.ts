import { ApiProperty } from '@nestjs/swagger';

export class TripSeatDto {
  @ApiProperty({
    format: 'uuid',
    example: 'bbafbc03-8486-42e1-9c54-c8f6e506c666',
  })
  seatId!: string;

  @ApiProperty({
    example: 1,
  })
  carNumber!: number;

  @ApiProperty({
    example: '2',
  })
  seatNumber!: string;

  @ApiProperty({
    example: '1/2',
  })
  label!: string;
}
