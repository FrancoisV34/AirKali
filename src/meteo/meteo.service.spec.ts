import { Test, TestingModule } from '@nestjs/testing';
import {
  BadGatewayException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { MeteoService } from './meteo.service';
import { PrismaService } from '../prisma/prisma.service';
import { MeteoApiService } from '../collecte/meteo-api.service';

describe('MeteoService', () => {
  let service: MeteoService;
  let prisma: PrismaService;
  let meteoApi: MeteoApiService;

  const mockCommune = {
    id: 1,
    nom: 'Paris',
    latitude: 48.8566,
    longitude: 2.3522,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeteoService,
        {
          provide: PrismaService,
          useValue: {
            commune: { findUnique: jest.fn() },
            donneeMeteo: { findMany: jest.fn() },
          },
        },
        {
          provide: MeteoApiService,
          useValue: { fetchCurrent: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<MeteoService>(MeteoService);
    prisma = module.get<PrismaService>(PrismaService);
    meteoApi = module.get<MeteoApiService>(MeteoApiService);
  });

  describe('getCurrent', () => {
    it('should return meteo data', async () => {
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue(mockCommune);
      (meteoApi.fetchCurrent as jest.Mock).mockResolvedValue({
        temperature: 18.5,
        pression: 1013,
        humidite: 65,
        meteoCiel: 'Peu nuageux',
        vitesseVent: 12,
        dateHeure: '2026-04-02T14:00',
      });

      const result = await service.getCurrent(1);
      expect(result.communeId).toBe(1);
      expect(result.temperature).toBe(18.5);
    });

    it('should throw NotFoundException if commune not found', async () => {
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.getCurrent(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadGatewayException on API error', async () => {
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue(mockCommune);
      (meteoApi.fetchCurrent as jest.Mock).mockRejectedValue(
        new Error('API down'),
      );
      await expect(service.getCurrent(1)).rejects.toThrow(BadGatewayException);
    });
  });

  describe('getHistory', () => {
    it('should return historical data', async () => {
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue(mockCommune);
      (prisma.donneeMeteo.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getHistory(1, '2026-03-01', '2026-03-31');
      expect(result.data).toEqual([]);
    });

    it('should throw on invalid date range > 90 days', async () => {
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue(mockCommune);
      await expect(
        service.getHistory(1, '2026-01-01', '2026-06-01'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
