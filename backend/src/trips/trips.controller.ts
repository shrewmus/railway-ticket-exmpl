import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SearchTripResultDto } from './dto/search-trip-result.dto';
import { SearchTripsQueryDto } from './dto/search-trips-query.dto';
import { TripDetailsDto } from './dto/trip-details.dto';
import { TripSegmentQueryDto } from './dto/trip-segment-query.dto';
import { TripsService } from './trips.service';

@ApiTags('trips')
@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Search trips by segment and date',
    description:
      'Returns trips whose route contains both stations in the correct order and has enough available seats for the requested segment.',
  })
  @ApiOkResponse({
    description:
      'Matching trips for the requested segment and date. Returns an empty array when no trips match.',
    type: SearchTripResultDto,
    isArray: true,
  })
  @ApiBadRequestResponse({
    description: 'Invalid query parameters for trip search.',
  })
  @ApiNotFoundResponse({
    description: 'One or both station identifiers do not exist.',
  })
  search(@Query() query: SearchTripsQueryDto) {
    return this.tripsService.searchTrips(query);
  }

  @Get(':tripId')
  @ApiOperation({
    summary: 'Get trip details for a selected segment',
    description:
      'Returns the full ordered route and a selected-segment summary for one trip.',
  })
  @ApiOkResponse({
    description: 'Trip details for the selected segment.',
    type: TripDetailsDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid trip segment query parameters.',
  })
  @ApiNotFoundResponse({
    description: 'Trip or one of the segment stations was not found.',
  })
  findOne(
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Query() query: TripSegmentQueryDto,
  ) {
    return this.tripsService.getTripDetails(tripId, query);
  }
}
