import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommuneService } from './commune.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CommuneService', () => {
  let service: CommuneService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommuneService,
        {
          provide: PrismaService,
          useValue: {
            commune: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<CommuneService>(CommuneService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('search', () => {
    it('should return communes matching query', async () => {
      const mockCommunes = [
        { id: 1, nom: 'Paris', codePostal: '75001', codeInsee: '75056' },
      ];
      (prisma.commune.findMany as jest.Mock).mockResolvedValue(mockCommunes);

      const result = await service.search('Par');
      expect(result).toEqual(mockCommunes);
    });

    it('should throw BadRequestException if query is less than 2 chars', async () => {
      await expect(service.search('P')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if query is empty', async () => {
      await expect(service.search('')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById', () => {
    it('should return a commune', async () => {
      const mockCommune = { id: 1, nom: 'Paris' };
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue(mockCommune);

      const result = await service.findById(1);
      expect(result).toEqual(mockCommune);
    });

    it('should throw NotFoundException if commune not found', async () => {
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.findById(999)).rejects.toThrow(NotFoundException);
    });
  });
});
