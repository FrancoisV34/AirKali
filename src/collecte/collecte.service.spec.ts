import { Test, TestingModule } from '@nestjs/testing';
import { CollecteService } from './collecte.service';
import { PrismaService } from '../prisma/prisma.service';
import { AirQualityApiService } from './air-quality-api.service';
import { MeteoApiService } from './meteo-api.service';
import { HttpService } from '@nestjs/axios';
import { AlertService } from '../alert/alert.service';

describe('CollecteService', () => {
  let service: CollecteService;
  let prisma: PrismaService;
  let airApi: AirQualityApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollecteService,
        {
          provide: PrismaService,
          useValue: {
            commune: {
              findMany: jest.fn().mockResolvedValue([]),
              updateMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
            donneeAir: { create: jest.fn() },
            donneeMeteo: { create: jest.fn() },
            logCollecte: { create: jest.fn() },
          },
        },
        {
          provide: AirQualityApiService,
          useValue: { fetchCurrent: jest.fn() },
        },
        {
          provide: MeteoApiService,
          useValue: { fetchCurrent: jest.fn() },
        },
        {
          provide: HttpService,
          useValue: { get: jest.fn() },
        },
        {
          provide: AlertService,
          useValue: {
            checkAirAlerts: jest.fn().mockResolvedValue(undefined),
            checkMeteoAlerts: jest.fn().mockResolvedValue(undefined),
            checkMeteoUnderThreshold: jest.fn().mockResolvedValue(undefined),
            purgeOldLogs: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<CollecteService>(CollecteService);
    prisma = module.get<PrismaService>(PrismaService);
    airApi = module.get<AirQualityApiService>(AirQualityApiService);
  });

  describe('collecteAir', () => {
    it('should log SUCCESS when no active communes', async () => {
      await service.collecteAir();

      expect(prisma.logCollecte.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'AIR',
            statut: 'SUCCESS',
            communesTraitees: 0,
          }),
        }),
      );
    });

    it('should process active communes and log results', async () => {
      const mockCommunes = [
        { id: 1, nom: 'Paris', latitude: 48.85, longitude: 2.35, active: true },
      ];
      (prisma.commune.findMany as jest.Mock).mockResolvedValue(mockCommunes);
      (airApi.fetchCurrent as jest.Mock).mockResolvedValue({
        ozone: 45,
        co: 230,
        pm25: 12,
        pm10: 18,
        indiceQualite: 3,
        dateHeure: '2026-04-02T14:00',
      });

      await service.collecteAir();

      expect(prisma.donneeAir.create).toHaveBeenCalled();
      expect(prisma.logCollecte.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            communesTraitees: 1,
            communesErreur: 0,
          }),
        }),
      );
    });

    it('should handle API errors gracefully', async () => {
      const mockCommunes = [
        { id: 1, nom: 'Paris', latitude: 48.85, longitude: 2.35, active: true },
      ];
      (prisma.commune.findMany as jest.Mock).mockResolvedValue(mockCommunes);
      (airApi.fetchCurrent as jest.Mock).mockRejectedValue(
        new Error('timeout'),
      );

      await service.collecteAir();

      expect(prisma.logCollecte.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            communesTraitees: 0,
            communesErreur: 1,
            statut: 'ERROR',
          }),
        }),
      );
    });
  });

  describe('desactivationCommunes', () => {
    it('should deactivate communes older than 7 days', async () => {
      (prisma.commune.updateMany as jest.Mock).mockResolvedValue({ count: 3 });
      await service.desactivationCommunes();
      expect(prisma.commune.updateMany).toHaveBeenCalled();
    });
  });
});
