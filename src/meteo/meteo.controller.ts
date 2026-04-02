import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { MeteoService } from './meteo.service';

@Controller('communes/:id/meteo')
export class MeteoController {
  constructor(private meteoService: MeteoService) {}

  @Get()
  getCurrent(@Param('id', ParseIntPipe) id: number) {
    return this.meteoService.getCurrent(id);
  }

  @Get('history')
  getHistory(
    @Param('id', ParseIntPipe) id: number,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.meteoService.getHistory(id, from, to);
  }
}
