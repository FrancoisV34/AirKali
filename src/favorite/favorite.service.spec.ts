import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { FavoriteService } from './favorite.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FavoriteService', () => {
  let service: FavoriteService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoriteService,
        {
          provide: PrismaService,
          useValue: {
            favori: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              count: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
            },
            commune: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
            },
            alert: {
              updateMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
          },
        },
      ],
    }).compile();

    service = module.get<FavoriteService>(FavoriteService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getFavorites', () => {
    it('should return user favorites', async () => {
      const mockFavorites = [
        { id: 1, communeId: 42, commune: { id: 42, nom: 'Lyon' } },
      ];
      (prisma.favori.findMany as jest.Mock).mockResolvedValue(mockFavorites);

      const result = await service.getFavorites(1);
      expect(result).toEqual(mockFavorites);
    });
  });

  describe('addFavorite', () => {
    const mockCommune = {
      id: 42,
      nom: 'Lyon',
      latitude: 45.764,
      longitude: 4.8357,
    };

    it('should create a favorite and activate commune', async () => {
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue(mockCommune);
      (prisma.favori.count as jest.Mock).mockResolvedValue(0);
      (prisma.favori.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.favori.create as jest.Mock).mockResolvedValue({
        id: 1,
        communeId: 42,
        commune: mockCommune,
      });
      (prisma.commune.update as jest.Mock).mockResolvedValue({});
      (prisma.commune.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.addFavorite(1, 42);
      expect(result.communeId).toBe(42);
      expect(prisma.commune.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 42 },
          data: expect.objectContaining({ active: true }),
        }),
      );
    });

    it('should throw NotFoundException if commune not found', async () => {
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.addFavorite(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if 10 favorites reached', async () => {
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue(mockCommune);
      (prisma.favori.count as jest.Mock).mockResolvedValue(10);

      await expect(service.addFavorite(1, 42)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException if already favorite', async () => {
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue(mockCommune);
      (prisma.favori.count as jest.Mock).mockResolvedValue(5);
      (prisma.favori.findUnique as jest.Mock).mockResolvedValue({ id: 1 });

      await expect(service.addFavorite(1, 42)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('removeFavorite', () => {
    it('should remove a favorite', async () => {
      (prisma.favori.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        userId: 1,
        communeId: 42,
      });
      (prisma.favori.delete as jest.Mock).mockResolvedValue({});
      (prisma.favori.count as jest.Mock).mockResolvedValue(0);
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue({
        id: 42,
        latitude: 45.764,
        longitude: 4.8357,
      });
      (prisma.commune.update as jest.Mock).mockResolvedValue({});
      (prisma.commune.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.removeFavorite(1, 42);
      expect(result.message).toBe('Favori supprimé');
    });

    it('should throw NotFoundException if favorite not found', async () => {
      (prisma.favori.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.removeFavorite(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
