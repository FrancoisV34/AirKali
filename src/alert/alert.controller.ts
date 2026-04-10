import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AlertService } from './alert.service';
import { CreateAlertDto } from './dto/create-alert.dto';

@Controller('alerts')
@UseGuards(JwtAuthGuard)
export class AlertController {
  constructor(private alertService: AlertService) {}

  @Get()
  getAlerts(@Request() req: { user: { id: number } }) {
    return this.alertService.getAlerts(req.user.id);
  }

  @Post()
  createAlert(
    @Request() req: { user: { id: number } },
    @Body() dto: CreateAlertDto,
  ) {
    return this.alertService.createAlert(req.user.id, dto);
  }

  @Patch(':id')
  toggleAlert(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number } },
  ) {
    return this.alertService.toggleAlert(id, req.user.id);
  }

  @Delete(':id')
  deleteAlert(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number } },
  ) {
    return this.alertService.deleteAlert(id, req.user.id);
  }

  @Get('history')
  getHistory(@Request() req: { user: { id: number } }) {
    return this.alertService.getHistory(req.user.id);
  }
}
