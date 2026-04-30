import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { BookingCreatedDto } from './dto/booking-created.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingsService } from './bookings.service';

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a booking for one trip segment',
    description:
      'Creates one booking and its seat items for the selected trip segment.',
  })
  @ApiCreatedResponse({
    description: 'Booking created successfully.',
    type: BookingCreatedDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid booking payload or seat selection.',
  })
  @ApiConflictResponse({
    description: 'One or more selected seats are no longer available.',
  })
  create(@Body() dto: CreateBookingDto) {
    return this.bookingsService.createBooking(dto);
  }
}
