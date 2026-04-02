import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { CommuneService } from './commune.service';

@Controller('communes')
export class CommuneController {
  constructor(private communeService: CommuneService) {}

  @Get()
  search(@Query('search') search: string) {
    return this.communeService.search(search);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.communeService.findById(id);
  }
}
