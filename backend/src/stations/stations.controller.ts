import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Station } from '../database/entities';
import { StationsService } from './stations.service';

@ApiTags('stations')
@Controller('stations')
export class StationsController {
  constructor(private readonly stationsService: StationsService) {}

  @Get()
  @ApiOperation({
    summary: 'List all stations',
    description: 'Returns all stations ordered by display name.',
  })
  @ApiOkResponse({
    description: 'Ordered station list.',
    type: Station,
    isArray: true,
  })
  findAll() {
    return this.stationsService.findAll();
  }
}
