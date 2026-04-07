import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  notification: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
};

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<NotificationService>(NotificationService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a notification with reason', async () => {
      mockPrisma.notification.create.mockResolvedValue({ id: 1, userId: 5, message: 'msg', reason: 'spam' });
      const result = await service.create(5, 'msg', 'spam');
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: { userId: 5, message: 'msg', reason: 'spam' },
      });
      expect(result.id).toBe(1);
    });

    it('should create a notification without reason', async () => {
      mockPrisma.notification.create.mockResolvedValue({ id: 2, userId: 5, message: 'msg', reason: null });
      await service.create(5, 'msg');
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: { userId: 5, message: 'msg', reason: null },
      });
    });
  });

  describe('getUnread', () => {
    it('should return only unread notifications for user', async () => {
      const unread = [{ id: 1, userId: 5, readAt: null }];
      mockPrisma.notification.findMany.mockResolvedValue(unread);

      const result = await service.getUnread(5);
      expect(result).toEqual(unread);
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 5, readAt: null },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('markAsRead', () => {
    it('should update readAt for matching notification', async () => {
      const notif = { id: 1, userId: 5, readAt: null };
      mockPrisma.notification.findFirst.mockResolvedValue(notif);
      mockPrisma.notification.update.mockResolvedValue({ ...notif, readAt: new Date() });

      const result = await service.markAsRead(1, 5);
      expect(result).not.toBeNull();
      expect(mockPrisma.notification.update).toHaveBeenCalled();
    });

    it('should return null if notification not found for this user', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);
      const result = await service.markAsRead(1, 99);
      expect(result).toBeNull();
      expect(mockPrisma.notification.update).not.toHaveBeenCalled();
    });
  });

  describe('cleanOld', () => {
    it('should delete notifications older than 7 days', async () => {
      mockPrisma.notification.deleteMany.mockResolvedValue({ count: 3 });
      await service.cleanOld();
      expect(mockPrisma.notification.deleteMany).toHaveBeenCalledWith({
        where: { createdAt: { lt: expect.any(Date) } },
      });
    });
  });
});
