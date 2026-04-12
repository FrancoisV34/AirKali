import { Controller, Get, Param, ParseIntPipe, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ExportService } from './export.service';
import { ExportFormat, ExportQueryDto, ExportType } from './dto/export-query.dto';

@Controller('communes')
export class ExportController {
  constructor(private exportService: ExportService) {}

  @Get(':id/export')
  @UseGuards(JwtAuthGuard)
  async exportData(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ExportQueryDto,
    @Res() res: Response,
  ) {
    const { commune, airData, meteoData } = await this.exportService.getExportData(
      id,
      query.type,
      query.from,
      query.to,
    );

    if (airData.length === 0 && meteoData.length === 0) {
      return res.json({ message: 'Aucune donnée disponible pour cette période' });
    }

    const typeLabel =
      query.type === ExportType.AIR ? 'air' : query.type === ExportType.METEO ? 'meteo' : 'complet';
    const filename = `export_${typeLabel}_${commune.nom}_${query.from}_${query.to}`;

    if (query.format === ExportFormat.CSV) {
      const csv = this.exportService.generateCsv(query.type, airData, meteoData);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(csv);
    }

    const pdf = await this.exportService.generatePdf(
      commune.nom,
      query.type,
      query.from,
      query.to,
      airData,
      meteoData,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
    return res.send(pdf);
  }
}
