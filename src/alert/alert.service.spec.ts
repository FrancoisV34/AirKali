import { Test, TestingModule } from '@nestjs/testing';
import { AlertService } from './alert.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationService } from '../notification/notification.service';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('AlertService', () => {
  let service: AlertService;
  let prisma: {
    user: { findUnique: jest.Mock };
    favori: { findUnique: jest.Mock; findMany: jest.Mock };
    alert: { findMany: jest.Mock; findFirst: jest.Mock; findUnique: jest.Mock; create: jest.Mock; update: jest.Mock; updateMany: jest.Mock; delete: jest.Mock; count: jest.Mock };
    alertLog: { findMany: jest.Mock; findFirst: jest.Mock; create: jest.Mock; update: jest.Mock; deleteMany: jest.Mock };
    commune: { findUnique: jest.Mock };
  };
  let mailService: { sendAlertEmail: jest.Mock };
  let notificationService: { create: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      favori: { findUnique: jest.fn(), findMany: jest.fn() },
      alert: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      alertLog: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      commune: { findUnique: jest.fn() },
    };

    mailService = { sendAlertEmail: jest.fn().mockResolvedValue(undefined) };
    notificationService = { create: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertService,
        { provide: PrismaService, useValue: prisma },
        { provide: MailService, useValue: mailService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<AlertService>(AlertService);
  });

  describe('createAlert', () => {
    const dto = { communeId: 1, type: 'AIR' as const, palier: 'AIR_MAUVAIS' as const };

    it('should create an alert successfully', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1, estSuspendu: false });
      prisma.favori.findUnique.mockResolvedValue({ id: 1 });
      prisma.alert.count.mockResolvedValue(0);
      prisma.alert.findUnique.mockResolvedValue(null);
      prisma.alert.create.mockResolvedValue({ id: 1, ...dto, active: true });

      const result = await service.createAlert(1, dto);
      expect(result).toEqual({ id: 1, ...dto, active: true });
      expect(prisma.alert.create).toHaveBeenCalled();
    });

    it('should throw if user is suspended', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1, estSuspendu: true });
      await expect(service.createAlert(1, dto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw if commune is not in favorites', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1, estSuspendu: false });
      prisma.favori.findUnique.mockResolvedValue(null);
      await expect(service.createAlert(1, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw if max 3 alerts reached', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1, estSuspendu: false });
      prisma.favori.findUnique.mockResolvedValue({ id: 1 });
      prisma.alert.count.mockResolvedValue(3);
      await expect(service.createAlert(1, dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw if duplicate alert exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1, estSuspendu: false });
      prisma.favori.findUnique.mockResolvedValue({ id: 1 });
      prisma.alert.count.mockResolvedValue(1);
      prisma.alert.findUnique.mockResolvedValue({ id: 2 });
      await expect(service.createAlert(1, dto)).rejects.toThrow(ConflictException);
    });

    it('should throw if palier incompatible with type', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1, estSuspendu: false });
      const bad = { communeId: 1, type: 'AIR' as const, palier: 'METEO_SEVERE' as const };
      await expect(service.createAlert(1, bad)).rejects.toThrow(BadRequestException);
    });
  });

  describe('toggleAlert', () => {
    it('should toggle alert active state', async () => {
      prisma.alert.findFirst.mockResolvedValue({ id: 1, active: true });
      prisma.user.findUnique.mockResolvedValue({ id: 1, estSuspendu: false });
      prisma.alert.update.mockResolvedValue({ id: 1, active: false });

      const result = await service.toggleAlert(1, 1);
      expect(result.active).toBe(false);
      expect(prisma.alert.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { active: false } }),
      );
    });

    it('should throw if alert not found', async () => {
      prisma.alert.findFirst.mockResolvedValue(null);
      await expect(service.toggleAlert(999, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAlert', () => {
    it('should delete alert', async () => {
      prisma.alert.findFirst.mockResolvedValue({ id: 1 });
      prisma.user.findUnique.mockResolvedValue({ id: 1, estSuspendu: false });
      prisma.alert.delete.mockResolvedValue({});

      const result = await service.deleteAlert(1, 1);
      expect(result.message).toBe('Alerte supprimee');
    });

    it('should throw if alert not found', async () => {
      prisma.alert.findFirst.mockResolvedValue(null);
      await expect(service.deleteAlert(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw if user is suspended', async () => {
      prisma.alert.findFirst.mockResolvedValue({ id: 1 });
      prisma.user.findUnique.mockResolvedValue({ id: 1, estSuspendu: true });
      await expect(service.deleteAlert(1, 1)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('checkAirAlerts', () => {
    it('should trigger alert when AQI exceeds threshold', async () => {
      prisma.commune.findUnique.mockResolvedValue({ id: 1, nom: 'Lyon' });
      prisma.alert.findMany.mockResolvedValue([{
        id: 1,
        communeId: 1,
        palier: 'AIR_MAUVAIS',
        wasUnderThreshold: true,
        lastTriggeredAt: null,
        user: { id: 1, email: 'test@test.fr', prenom: 'Test' },
      }]);
      prisma.alertLog.create.mockResolvedValue({ id: 1 });
      prisma.alert.update.mockResolvedValue({});
      prisma.alertLog.update.mockResolvedValue({});
      prisma.favori.findMany.mockResolvedValue([]);

      await service.checkAirAlerts(1, 120);

      expect(prisma.alertLog.create).toHaveBeenCalled();
      expect(mailService.sendAlertEmail).toHaveBeenCalled();
      expect(notificationService.create).toHaveBeenCalled();
    });

    it('should not trigger if cooldown active', async () => {
      prisma.commune.findUnique.mockResolvedValue({ id: 1, nom: 'Lyon' });
      prisma.alert.findMany.mockResolvedValue([{
        id: 1,
        communeId: 1,
        palier: 'AIR_MAUVAIS',
        wasUnderThreshold: true,
        lastTriggeredAt: new Date(), // Just triggered
        user: { id: 1, email: 'test@test.fr', prenom: 'Test' },
      }]);
      prisma.favori.findMany.mockResolvedValue([]);

      await service.checkAirAlerts(1, 120);

      expect(prisma.alertLog.create).not.toHaveBeenCalled();
    });

    it('should not trigger if wasUnderThreshold is false', async () => {
      prisma.commune.findUnique.mockResolvedValue({ id: 1, nom: 'Lyon' });
      prisma.alert.findMany.mockResolvedValue([{
        id: 1,
        communeId: 1,
        palier: 'AIR_MAUVAIS',
        wasUnderThreshold: false,
        lastTriggeredAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        user: { id: 1, email: 'test@test.fr', prenom: 'Test' },
      }]);
      prisma.favori.findMany.mockResolvedValue([]);

      await service.checkAirAlerts(1, 120);

      expect(prisma.alertLog.create).not.toHaveBeenCalled();
    });

    it('should reset wasUnderThreshold when AQI goes below threshold', async () => {
      prisma.commune.findUnique.mockResolvedValue({ id: 1, nom: 'Lyon' });
      prisma.alert.findMany.mockResolvedValue([{
        id: 1,
        communeId: 1,
        palier: 'AIR_MAUVAIS',
        wasUnderThreshold: false,
        lastTriggeredAt: new Date(),
        user: { id: 1, email: 'test@test.fr', prenom: 'Test' },
      }]);
      prisma.alert.update.mockResolvedValue({});
      prisma.favori.findMany.mockResolvedValue([]);

      await service.checkAirAlerts(1, 50); // Below threshold

      expect(prisma.alert.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { wasUnderThreshold: true } }),
      );
    });

    it('should skip if AQI is null', async () => {
      await service.checkAirAlerts(1, null);
      expect(prisma.commune.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('purgeOldLogs', () => {
    it('should delete logs older than 30 days', async () => {
      prisma.alertLog.deleteMany.mockResolvedValue({ count: 5 });
      await service.purgeOldLogs();
      expect(prisma.alertLog.deleteMany).toHaveBeenCalledWith({
        where: { createdAt: { lt: expect.any(Date) } },
      });
    });
  });
});
