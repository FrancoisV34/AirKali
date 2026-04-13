import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AirQualityService } from './air-quality.service';

@ApiTags('Qualité de l\'air')
@Controller('communes/:id/air')
export class AirQualityController {
  constructor(private airQualityService: AirQualityService) {}

  @Get()
  getCurrent(@Param('id', ParseIntPipe) id: number) {
    return this.airQualityService.getCurrent(id);
  }

  @Get('history')
  getHistory(
    @Param('id', ParseIntPipe) id: number,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.airQualityService.getHistory(id, from, to);
  }
}
