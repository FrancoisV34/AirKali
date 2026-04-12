import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExportService } from './export.service';
import { PrismaService } from '../prisma/prisma.service';
import { ExportType } from './dto/export-query.dto';

describe('ExportService', () => {
  let service: ExportService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        {
          provide: PrismaService,
          useValue: {
            commune: { findUnique: jest.fn() },
            donneeAir: { findMany: jest.fn() },
            donneeMeteo: { findMany: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getExportData', () => {
    it('should throw if from > to', async () => {
      await expect(
        service.getExportData(1, ExportType.AIR, '2026-04-30', '2026-04-01'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if period > 31 days', async () => {
      await expect(
        service.getExportData(1, ExportType.AIR, '2026-01-01', '2026-03-01'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if commune not found', async () => {
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        service.getExportData(999, ExportType.AIR, '2026-04-01', '2026-04-15'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return air data only for type AIR', async () => {
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue({ id: 1, nom: 'Lyon' });
      (prisma.donneeAir.findMany as jest.Mock).mockResolvedValue([
        { dateHeure: new Date('2026-04-01'), indiceQualite: 42, pm25: 12, pm10: 20, ozone: 30, co: 0.5 },
      ]);

      const result = await service.getExportData(1, ExportType.AIR, '2026-04-01', '2026-04-15');

      expect(result.airData).toHaveLength(1);
      expect(result.meteoData).toHaveLength(0);
      expect(prisma.donneeMeteo.findMany).not.toHaveBeenCalled();
    });

    it('should return both air and meteo data for type BOTH', async () => {
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue({ id: 1, nom: 'Lyon' });
      (prisma.donneeAir.findMany as jest.Mock).mockResolvedValue([{ dateHeure: new Date() }]);
      (prisma.donneeMeteo.findMany as jest.Mock).mockResolvedValue([{ dateHeure: new Date() }]);

      const result = await service.getExportData(1, ExportType.BOTH, '2026-04-01', '2026-04-15');

      expect(result.airData).toHaveLength(1);
      expect(result.meteoData).toHaveLength(1);
    });
  });

  describe('generateCsv', () => {
    it('should generate CSV with semicolons for air data', () => {
      const airData = [
        { dateHeure: new Date('2026-04-01'), indiceQualite: 42, pm25: 12, pm10: 20, ozone: 30, co: 0.5 },
        { dateHeure: new Date('2026-04-02'), indiceQualite: 55, pm25: 18, pm10: 25, ozone: 40, co: 0.8 },
      ];

      const csv = service.generateCsv(ExportType.AIR, airData, []);

      expect(csv).toContain('\uFEFF'); // BOM
      expect(csv).toContain('Date;AQI;PM2.5;PM10;Ozone;CO');
      expect(csv).toContain('2026-04-01;42;12;20;30;0.5');
      expect(csv).toContain('2026-04-02;55;18;25;40;0.8');
    });

    it('should generate CSV with meteo data', () => {
      const meteoData = [
        { dateHeure: new Date('2026-04-01'), temperature: 15, humidite: 60, vitesseVent: 10, pression: 1013, meteoCiel: 'Ensoleillé' },
      ];

      const csv = service.generateCsv(ExportType.METEO, [], meteoData);

      expect(csv).toContain('Date;Temperature (°C);Humidite (%);Vent (km/h);Pression (hPa);Ciel');
      expect(csv).toContain('2026-04-01;15;60;10;1013;Ensoleillé');
    });

    it('should generate combined CSV for type BOTH', () => {
      const airData = [{ dateHeure: new Date('2026-04-01'), indiceQualite: 42, pm25: 12, pm10: 20, ozone: 30, co: 0.5 }];
      const meteoData = [{ dateHeure: new Date('2026-04-01'), temperature: 15, humidite: 60, vitesseVent: 10, pression: 1013, meteoCiel: 'Nuageux' }];

      const csv = service.generateCsv(ExportType.BOTH, airData, meteoData);

      expect(csv).toContain('Date;AQI');
      expect(csv).toContain('Date;Temperature');
    });

    it('should handle null values gracefully', () => {
      const airData = [{ dateHeure: new Date('2026-04-01'), indiceQualite: null, pm25: null, pm10: null, ozone: null, co: null }];

      const csv = service.generateCsv(ExportType.AIR, airData, []);

      expect(csv).toContain('2026-04-01;;;;;');
    });
  });
});
