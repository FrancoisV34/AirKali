import { Test, TestingModule } from '@nestjs/testing';
import {
  BadGatewayException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AirQualityService } from './air-quality.service';
import { PrismaService } from '../prisma/prisma.service';
import { AirQualityApiService } from '../collecte/air-quality-api.service';

describe('AirQualityService', () => {
  let service: AirQualityService;
  let prisma: PrismaService;
  let airApi: AirQualityApiService;

  const mockCommune = {
    id: 1,
    nom: 'Paris',
    latitude: 48.8566,
    longitude: 2.3522,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AirQualityService,
        {
          provide: PrismaService,
          useValue: {
            commune: { findUnique: jest.fn() },
            donneeAir: { findMany: jest.fn() },
          },
        },
        {
          provide: AirQualityApiService,
          useValue: { fetchCurrent: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AirQualityService>(AirQualityService);
    prisma = module.get<PrismaService>(PrismaService);
    airApi = module.get<AirQualityApiService>(AirQualityApiService);
  });

  describe('getCurrent', () => {
    it('should return air quality data', async () => {
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue(mockCommune);
      (airApi.fetchCurrent as jest.Mock).mockResolvedValue({
        ozone: 45,
        co: 230,
        pm25: 12,
        pm10: 18,
        indiceQualite: 3,
        dateHeure: '2026-04-02T14:00',
      });

      const result = await service.getCurrent(1);
      expect(result.communeId).toBe(1);
      expect(result.ozone).toBe(45);
    });

    it('should throw NotFoundException if commune not found', async () => {
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.getCurrent(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadGatewayException on API error', async () => {
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue(mockCommune);
      (airApi.fetchCurrent as jest.Mock).mockRejectedValue(
        new Error('API down'),
      );
      await expect(service.getCurrent(1)).rejects.toThrow(
        BadGatewayException,
      );
    });
  });

  describe('getHistory', () => {
    it('should return historical data', async () => {
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue(mockCommune);
      (prisma.donneeAir.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getHistory(
        1,
        '2026-03-01',
        '2026-03-31',
      );
      expect(result.communeId).toBe(1);
      expect(result.data).toEqual([]);
    });

    it('should throw if commune not found', async () => {
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        service.getHistory(999, '2026-03-01', '2026-03-31'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if date range exceeds 90 days', async () => {
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue(mockCommune);
      await expect(
        service.getHistory(1, '2026-01-01', '2026-06-01'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if from > to', async () => {
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue(mockCommune);
      await expect(
        service.getHistory(1, '2026-03-31', '2026-03-01'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
