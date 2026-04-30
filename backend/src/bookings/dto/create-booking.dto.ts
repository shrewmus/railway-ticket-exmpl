import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Trip identifier for the booking.',
    example: 'b32c8e55-42da-47d6-9439-39eb71ae93c5',
  })
  @IsUUID('4')
  tripId!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Departure station identifier for the booked segment.',
    example: '53c4b7c8-9933-498a-a4e9-1778d6d49fb7',
  })
  @IsUUID('4')
  fromStationId!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Arrival station identifier for the booked segment.',
    example: 'f7850da6-47c8-4068-a92f-9510f8b34f65',
  })
  @IsUUID('4')
  toStationId!: string;

  @ApiProperty({
    type: String,
    isArray: true,
    minItems: 1,
    maxItems: 5,
    description: 'Exact seat identifiers selected by the user.',
    example: [
      'bbafbc03-8486-42e1-9c54-c8f6e506c666',
      'f2328550-233e-4061-a0b8-86544bfd8887',
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  seatIds!: string[];

  @ApiProperty({
    description: 'Purchaser display name used for the booking.',
    example: 'Aline Mercer',
    minLength: 2,
    maxLength: 255,
  })
  @IsString()
  @Length(2, 255)
  customerName!: string;

  @ApiProperty({
    description: 'Document number confirmed during purchase.',
    example: 'DOC-1001',
    minLength: 3,
    maxLength: 128,
  })
  @IsString()
  @Length(3, 128)
  documentNumber!: string;
}
