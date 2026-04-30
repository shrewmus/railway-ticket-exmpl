import { ApiProperty } from '@nestjs/swagger';

export class BookingCreatedDto {
  @ApiProperty({
    format: 'uuid',
    example: '0c16be4f-0995-4c23-a543-d7544c447ea1',
  })
  bookingId!: string;

  @ApiProperty({
    format: 'uuid',
    example: 'b32c8e55-42da-47d6-9439-39eb71ae93c5',
  })
  tripId!: string;

  @ApiProperty({
    type: Number,
    example: 2,
  })
  seatCount!: number;

  @ApiProperty({
    type: String,
    format: 'decimal',
    example: '80.00',
  })
  totalPrice!: string;

  @ApiProperty({
    type: String,
    isArray: true,
    example: [
      'bbafbc03-8486-42e1-9c54-c8f6e506c666',
      'f2328550-233e-4061-a0b8-86544bfd8887',
    ],
  })
  seatIds!: string[];
}
