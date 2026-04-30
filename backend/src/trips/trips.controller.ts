import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { SearchTripResultDto } from './dto/search-trip-result.dto';
import { SearchTripsQueryDto } from './dto/search-trips-query.dto';
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
}
