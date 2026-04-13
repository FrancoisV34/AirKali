import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { ManualAlertService } from './manual-alert.service';
import { CreateManualAlertDto } from './dto/create-manual-alert.dto';

@ApiTags('Admin — Alertes manuelles')
@ApiBearerAuth()
@Controller('admin/alertes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ManualAlertAdminController {
  constructor(private manualAlertService: ManualAlertService) {}

  @Post()
  @ApiOperation({ summary: 'Créer une alerte manuelle pour une commune' })
  @ApiResponse({ status: 201, description: 'Alerte créée' })
  @ApiResponse({ status: 404, description: 'Commune introuvable' })
  create(
    @Body() dto: CreateManualAlertDto,
    @Request() req: { user: { sub: number } },
  ) {
    return this.manualAlertService.create(req.user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister toutes les alertes manuelles (actives + clôturées)' })
  findAll() {
    return this.manualAlertService.findAll();
  }

  @Patch(':id/close')
  @ApiOperation({ summary: 'Clôturer une alerte manuelle' })
  @ApiResponse({ status: 200, description: 'Alerte clôturée' })
  @ApiResponse({ status: 400, description: 'Alerte déjà clôturée' })
  @ApiResponse({ status: 404, description: 'Alerte introuvable' })
  close(@Param('id', ParseIntPipe) id: number) {
    return this.manualAlertService.close(id);
  }
}

@ApiTags('Alertes manuelles')
@Controller('communes')
export class ManualAlertPublicController {
  constructor(private manualAlertService: ManualAlertService) {}

  @Get(':id/manual-alerts')
  @ApiOperation({ summary: 'Obtenir les alertes manuelles actives d\'une commune' })
  getActiveAlerts(@Param('id', ParseIntPipe) communeId: number) {
    return this.manualAlertService.getActiveByCommune(communeId);
  }
}
