import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { CommuneService } from './commune.service';

@Controller('communes')
export class CommuneController {
  constructor(private communeService: CommuneService) {}

  @Get()
  search(@Query('search') search: string) {
    return this.communeService.search(search);
  }

  @Get('active')
  getActive(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.communeService.getActiveCommunes(page, limit);
  }

  @Get(':id')
  findById(@Param('id', ParseIntPipe) id: number) {
    return this.communeService.findById(id);
  }
}
