import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ManualAlertService } from './manual-alert.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ManualAlertService', () => {
  let service: ManualAlertService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ManualAlertService,
        {
          provide: PrismaService,
          useValue: {
            commune: { findUnique: jest.fn() },
            manualAlert: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ManualAlertService>(ManualAlertService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('should throw NotFoundException if commune not found', async () => {
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create(1, { communeId: 999, palier: 'AIR_MAUVAIS' as any }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create an alert with 7-day expiration', async () => {
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue({ id: 1, nom: 'Lyon' });
      (prisma.manualAlert.create as jest.Mock).mockResolvedValue({
        id: 1,
        communeId: 1,
        palier: 'AIR_MAUVAIS',
        message: null,
        createdBy: 1,
        expiresAt: new Date(),
      });

      await service.create(1, { communeId: 1, palier: 'AIR_MAUVAIS' as any });

      const createCall = (prisma.manualAlert.create as jest.Mock).mock.calls[0][0];
      const expiresAt = createCall.data.expiresAt as Date;
      const now = new Date();
      const diffDays = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(6.9);
      expect(diffDays).toBeLessThan(7.1);
    });

    it('should create an alert with optional message', async () => {
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue({ id: 1, nom: 'Lyon' });
      (prisma.manualAlert.create as jest.Mock).mockResolvedValue({ id: 1 });

      await service.create(1, {
        communeId: 1,
        palier: 'AIR_MAUVAIS' as any,
        message: 'Incendie en cours',
      });

      const createCall = (prisma.manualAlert.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.message).toBe('Incendie en cours');
    });
  });

  describe('close', () => {
    it('should throw NotFoundException if alert not found', async () => {
      (prisma.manualAlert.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.close(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if already closed', async () => {
      (prisma.manualAlert.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        closedAt: new Date(),
      });

      await expect(service.close(1)).rejects.toThrow(BadRequestException);
    });

    it('should close an active alert', async () => {
      (prisma.manualAlert.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        closedAt: null,
      });
      (prisma.manualAlert.update as jest.Mock).mockResolvedValue({
        id: 1,
        closedAt: new Date(),
      });

      const result = await service.close(1);
      expect(result.closedAt).toBeDefined();
    });
  });

  describe('getActiveByCommune', () => {
    it('should return only active non-expired alerts', async () => {
      (prisma.manualAlert.findMany as jest.Mock).mockResolvedValue([
        { id: 1, palier: 'AIR_MAUVAIS', message: 'Test' },
      ]);

      const result = await service.getActiveByCommune(1);
      expect(result).toHaveLength(1);

      const call = (prisma.manualAlert.findMany as jest.Mock).mock.calls[0][0];
      expect(call.where.closedAt).toBeNull();
      expect(call.where.expiresAt).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return alerts with computed statut', async () => {
      const future = new Date();
      future.setDate(future.getDate() + 3);
      const past = new Date();
      past.setDate(past.getDate() - 1);

      (prisma.manualAlert.findMany as jest.Mock).mockResolvedValue([
        { id: 1, closedAt: null, expiresAt: future, commune: { nom: 'Lyon' }, admin: { nom: 'A', prenom: 'B' } },
        { id: 2, closedAt: new Date(), expiresAt: future, commune: { nom: 'Paris' }, admin: { nom: 'A', prenom: 'B' } },
        { id: 3, closedAt: null, expiresAt: past, commune: { nom: 'Marseille' }, admin: { nom: 'A', prenom: 'B' } },
      ]);

      const result = await service.findAll();
      expect(result[0].statut).toBe('Active');
      expect(result[1].statut).toBe('Clôturée');
      expect(result[2].statut).toBe('Expirée');
    });
  });
});
