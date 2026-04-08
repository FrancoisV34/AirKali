import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { MailService } from '../mail/mail.service';
import { Role } from '../common/enums/role.enum';

const mockUserNormal = {
  id: 2,
  email: 'user@test.com',
  prenom: 'Jean',
  nom: 'Dupont',
  role: Role.UTILISATEUR,
  estSuspendu: false,
};

const mockAdmin = {
  id: 1,
  email: 'admin@test.com',
  prenom: 'Admin',
  nom: 'Super',
  role: Role.ADMIN,
  estSuspendu: false,
};

describe('AdminService', () => {
  let service: AdminService;
  let prisma: PrismaService;
  let notificationService: NotificationService;
  let mailService: MailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            suspensionLog: {
              create: jest.fn(),
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: NotificationService,
          useValue: { create: jest.fn() },
        },
        {
          provide: MailService,
          useValue: {
            sendSuspensionEmail: jest.fn(),
            sendReactivationEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prisma = module.get<PrismaService>(PrismaService);
    notificationService = module.get<NotificationService>(NotificationService);
    mailService = module.get<MailService>(MailService);
  });

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([mockUserNormal]);
      (prisma.user.count as jest.Mock).mockResolvedValue(1);

      const result = await service.getUsers(undefined, 1, 20);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter by search term', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([mockUserNormal]);
      (prisma.user.count as jest.Mock).mockResolvedValue(1);

      await service.getUsers('Dupont', 1, 20);

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { OR: [{ nom: { contains: 'Dupont' } }, { prenom: { contains: 'Dupont' } }] },
        }),
      );
    });
  });

  describe('suspendUser', () => {
    it('should suspend user successfully', async () => {
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(mockUserNormal);
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      (prisma.suspensionLog.create as jest.Mock).mockResolvedValue({});
      (notificationService.create as jest.Mock).mockResolvedValue({});
      (mailService.sendSuspensionEmail as jest.Mock).mockResolvedValue(undefined);

      const result = await service.suspendUser(1, 2, 'Spam répété');

      expect(result).toEqual({ message: 'Utilisateur suspendu.' });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { estSuspendu: true },
      });
      expect(prisma.suspensionLog.create).toHaveBeenCalledWith({
        data: { userId: 2, adminId: 1, action: 'SUSPEND', motif: 'Spam répété' },
      });
      expect(notificationService.create).toHaveBeenCalledWith(
        2,
        'Votre compte a été suspendu par un administrateur.',
        'Spam répété',
      );
      expect(mailService.sendSuspensionEmail).toHaveBeenCalledWith(
        'user@test.com',
        'Jean',
        'Spam répété',
      );
    });

    it('should throw ForbiddenException when admin tries to suspend themselves', async () => {
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce({ ...mockUserNormal, id: 1 });

      await expect(service.suspendUser(1, 1, 'Motif')).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when trying to suspend an admin', async () => {
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce({ ...mockUserNormal, id: 3, role: Role.ADMIN });

      await expect(service.suspendUser(1, 3, 'Motif')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when user is already suspended', async () => {
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce({ ...mockUserNormal, estSuspendu: true });

      await expect(service.suspendUser(1, 2, 'Motif')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when target user does not exist', async () => {
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockAdmin)
        .mockResolvedValueOnce(null);

      await expect(service.suspendUser(1, 999, 'Motif')).rejects.toThrow(NotFoundException);
    });
  });

  describe('reactivateUser', () => {
    it('should reactivate user successfully', async () => {
      const suspendedUser = { ...mockUserNormal, estSuspendu: true };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(suspendedUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({});
      (prisma.suspensionLog.create as jest.Mock).mockResolvedValue({});
      (notificationService.create as jest.Mock).mockResolvedValue({});
      (mailService.sendReactivationEmail as jest.Mock).mockResolvedValue(undefined);

      const result = await service.reactivateUser(1, 2);

      expect(result).toEqual({ message: 'Utilisateur réactivé.' });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { estSuspendu: false },
      });
      expect(prisma.suspensionLog.create).toHaveBeenCalledWith({
        data: { userId: 2, adminId: 1, action: 'REACTIVATE', motif: null },
      });
    });

    it('should throw BadRequestException when user is not suspended', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserNormal);
      await expect(service.reactivateUser(1, 2)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.reactivateUser(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSuspensionHistory', () => {
    it('should return suspension logs for a user', async () => {
      const mockLogs = [
        { id: 1, action: 'SUSPEND', motif: 'Spam', createdAt: new Date() },
        { id: 2, action: 'REACTIVATE', motif: null, createdAt: new Date() },
      ];
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUserNormal);
      (prisma.suspensionLog.findMany as jest.Mock).mockResolvedValue(mockLogs);

      const result = await service.getSuspensionHistory(2);

      expect(result).toHaveLength(2);
      expect(result[0].action).toBe('SUSPEND');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.getSuspensionHistory(999)).rejects.toThrow(NotFoundException);
    });
  });
});
