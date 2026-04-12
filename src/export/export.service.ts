import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExportType } from './dto/export-query.dto';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  async getExportData(
    communeId: number,
    type: ExportType,
    from: string,
    to: string,
  ) {
    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (fromDate > toDate) {
      throw new BadRequestException(
        'La date de début doit être antérieure à la date de fin',
      );
    }

    const diffMs = toDate.getTime() - fromDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays > 31) {
      throw new BadRequestException('La période ne peut pas dépasser 1 mois');
    }

    const commune = await this.prisma.commune.findUnique({
      where: { id: communeId },
    });
    if (!commune) {
      throw new NotFoundException('Commune introuvable');
    }

    let airData: any[] = [];
    let meteoData: any[] = [];

    if (type === ExportType.AIR || type === ExportType.BOTH) {
      airData = await this.prisma.donneeAir.findMany({
        where: {
          communeId,
          dateHeure: { gte: fromDate, lte: toDate },
        },
        orderBy: { dateHeure: 'asc' },
      });
    }

    if (type === ExportType.METEO || type === ExportType.BOTH) {
      meteoData = await this.prisma.donneeMeteo.findMany({
        where: {
          communeId,
          dateHeure: { gte: fromDate, lte: toDate },
        },
        orderBy: { dateHeure: 'asc' },
      });
    }

    return { commune, airData, meteoData };
  }

  generateCsv(type: ExportType, airData: any[], meteoData: any[]): string {
    const sep = ';';
    const lines: string[] = [];

    if (type === ExportType.AIR || type === ExportType.BOTH) {
      lines.push(['Date', 'AQI', 'PM2.5', 'PM10', 'Ozone', 'CO'].join(sep));
      for (const row of airData) {
        lines.push(
          [
            this.formatDate(row.dateHeure),
            row.indiceQualite ?? '',
            row.pm25 ?? '',
            row.pm10 ?? '',
            row.ozone ?? '',
            row.co ?? '',
          ].join(sep),
        );
      }
    }

    if (type === ExportType.METEO || type === ExportType.BOTH) {
      if (type === ExportType.BOTH && lines.length > 0) {
        lines.push('');
      }
      lines.push(
        ['Date', 'Temperature (°C)', 'Humidite (%)', 'Vent (km/h)', 'Pression (hPa)', 'Ciel'].join(sep),
      );
      for (const row of meteoData) {
        lines.push(
          [
            this.formatDate(row.dateHeure),
            row.temperature ?? '',
            row.humidite ?? '',
            row.vitesseVent ?? '',
            row.pression ?? '',
            row.meteoCiel ?? '',
          ].join(sep),
        );
      }
    }

    return '\uFEFF' + lines.join('\n');
  }

  async generatePdf(
    communeNom: string,
    type: ExportType,
    from: string,
    to: string,
    airData: any[],
    meteoData: any[],
  ): Promise<Buffer> {
    const typeLabel =
      type === ExportType.AIR ? 'Air' : type === ExportType.METEO ? 'Météo' : 'Complètes';

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    // Title
    doc.fontSize(18).text(`Données ${typeLabel} — ${communeNom}`, { align: 'center' });
    doc.fontSize(11).fillColor('#666').text(`Période du ${from} au ${to}`, { align: 'center' });
    doc.moveDown(1.5);
    doc.fillColor('#000');

    if (type === ExportType.AIR || type === ExportType.BOTH) {
      if (type === ExportType.BOTH) {
        doc.fontSize(13).text('Qualité de l\'air', { underline: true });
        doc.moveDown(0.5);
      }
      this.drawTable(doc, ['Date', 'AQI', 'PM2.5', 'PM10', 'O3', 'CO'], airData, [
        (r: any) => this.formatDate(r.dateHeure),
        (r: any) => r.indiceQualite?.toString() ?? '-',
        (r: any) => r.pm25?.toString() ?? '-',
        (r: any) => r.pm10?.toString() ?? '-',
        (r: any) => r.ozone?.toString() ?? '-',
        (r: any) => r.co?.toString() ?? '-',
      ]);
      doc.moveDown(1);
    }

    if (type === ExportType.METEO || type === ExportType.BOTH) {
      if (type === ExportType.BOTH) {
        doc.fontSize(13).text('Météo', { underline: true });
        doc.moveDown(0.5);
      }
      this.drawTable(doc, ['Date', 'Temp °C', 'Hum %', 'Vent km/h', 'hPa', 'Ciel'], meteoData, [
        (r: any) => this.formatDate(r.dateHeure),
        (r: any) => r.temperature?.toString() ?? '-',
        (r: any) => r.humidite?.toString() ?? '-',
        (r: any) => r.vitesseVent?.toString() ?? '-',
        (r: any) => r.pression?.toString() ?? '-',
        (r: any) => r.meteoCiel ?? '-',
      ]);
    }

    doc.end();

    return new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  private drawTable(
    doc: PDFKit.PDFDocument,
    headers: string[],
    data: any[],
    extractors: ((row: any) => string)[],
  ): void {
    const colWidth = (doc.page.width - 80) / headers.length;
    const startX = 40;
    let y = doc.y;

    // Headers
    doc.fontSize(8).font('Helvetica-Bold');
    headers.forEach((h, i) => {
      doc.text(h, startX + i * colWidth, y, { width: colWidth, continued: false });
    });
    y = doc.y + 4;
    doc.moveTo(startX, y).lineTo(doc.page.width - 40, y).stroke();
    y += 4;

    // Rows
    doc.font('Helvetica').fontSize(7);
    for (const row of data) {
      if (y > doc.page.height - 60) {
        doc.addPage();
        y = 40;
      }
      extractors.forEach((ext, i) => {
        doc.text(ext(row), startX + i * colWidth, y, { width: colWidth, continued: false });
      });
      y = doc.y + 2;
    }
  }

  private formatDate(dateHeure: Date | string): string {
    return new Date(dateHeure).toISOString().split('T')[0];
  }
}
