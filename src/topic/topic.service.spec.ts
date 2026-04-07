import { ForbiddenException, HttpException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TopicService } from './topic.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { Role } from '../common/enums/role.enum';

const mockPrisma = {
  topic: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
  category: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  comment: { groupBy: jest.fn() },
  vote: { groupBy: jest.fn(), aggregate: jest.fn(), findUnique: jest.fn() },
};

const mockNotificationService = {
  create: jest.fn().mockResolvedValue({}),
};

describe('TopicService', () => {
  let service: TopicService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TopicService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();
    service = module.get<TopicService>(TopicService);
    jest.clearAllMocks();
  });

  const now = new Date();
  const mockTopic = {
    id: 1,
    title: 'Test Topic',
    content: 'Test content',
    categoryId: null,
    userId: 1,
    status: 'visible',
    isClosed: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    category: null,
    user: { id: 1, username: 'user1' },
  };

  describe('findOne', () => {
    it('should return a topic with score and userVote', async () => {
      mockPrisma.topic.findFirst.mockResolvedValue(mockTopic);
      mockPrisma.vote.aggregate.mockResolvedValue({ _sum: { value: 5 } });
      mockPrisma.vote.findUnique.mockResolvedValue({ value: 1 });

      const result = await service.findOne(1, 2);
      expect(result.score).toBe(5);
      expect(result.userVote).toBe(1);
      expect(result.author).toEqual({ id: 1, pseudo: 'user1' });
    });

    it('should throw NotFoundException if topic not found', async () => {
      mockPrisma.topic.findFirst.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should throw ForbiddenException if user is suspended', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1, estSuspendu: true });
      await expect(
        service.create(1, { title: 'Hello world', content: 'Content here', categoryId: null }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw 429 if user has 3 topics today', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1, estSuspendu: false });
      mockPrisma.topic.count.mockResolvedValue(3);
      await expect(
        service.create(1, { title: 'Hello world', content: 'Content here', categoryId: null }),
      ).rejects.toThrow(HttpException);
    });

    it('should throw NotFoundException if categoryId does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1, estSuspendu: false });
      mockPrisma.topic.count.mockResolvedValue(0);
      mockPrisma.category.findUnique.mockResolvedValue(null);
      await expect(
        service.create(1, { title: 'Hello world', content: 'Content here', categoryId: 99 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create a topic successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1, estSuspendu: false });
      mockPrisma.topic.count.mockResolvedValue(0);
      mockPrisma.topic.create.mockResolvedValue(mockTopic);
      const result = await service.create(1, { title: 'Hello world', content: 'Content here', categoryId: null });
      expect(result.id).toBe(1);
      expect(result.author).toEqual({ id: 1, pseudo: 'user1' });
    });
  });

  describe('update', () => {
    it('should throw ForbiddenException if not author or admin', async () => {
      mockPrisma.topic.findFirst.mockResolvedValue({ ...mockTopic, userId: 99 });
      await expect(
        service.update(1, 1, Role.UTILISATEUR, { title: 'New title' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update if user is admin', async () => {
      mockPrisma.topic.findFirst.mockResolvedValue({ ...mockTopic, userId: 99 });
      mockPrisma.topic.update.mockResolvedValue(mockTopic);
      const result = await service.update(1, 1, Role.ADMIN, { title: 'New title' });
      expect(result).toBeDefined();
    });
  });

  describe('hideTopic', () => {
    it('should set status to hidden and create notification', async () => {
      mockPrisma.topic.findFirst.mockResolvedValue(mockTopic);
      mockPrisma.topic.update.mockResolvedValue({ ...mockTopic, status: 'hidden' });

      const result = await service.hideTopic(1, 'spam');
      expect(result).toEqual({ success: true });
      expect(mockPrisma.topic.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { status: 'hidden' } });
      expect(mockNotificationService.create).toHaveBeenCalledWith(
        1,
        'Votre contenu a été masqué par un admin. Raison : spam',
        'spam',
      );
    });

    it('should send generic notification when no reason', async () => {
      mockPrisma.topic.findFirst.mockResolvedValue(mockTopic);
      mockPrisma.topic.update.mockResolvedValue({});

      await service.hideTopic(1);
      expect(mockNotificationService.create).toHaveBeenCalledWith(
        1,
        'Votre contenu a été masqué par un admin',
        undefined,
      );
    });

    it('should throw NotFoundException if topic not found', async () => {
      mockPrisma.topic.findFirst.mockResolvedValue(null);
      await expect(service.hideTopic(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('showTopic', () => {
    it('should set status to visible', async () => {
      mockPrisma.topic.findFirst.mockResolvedValue({ ...mockTopic, status: 'hidden' });
      mockPrisma.topic.update.mockResolvedValue({ ...mockTopic, status: 'visible' });

      const result = await service.showTopic(1);
      expect(result).toEqual({ success: true });
      expect(mockPrisma.topic.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { status: 'visible' } });
    });
  });

  describe('deleteTopic', () => {
    it('should delete topic and notify all unique authors', async () => {
      const topicWithComments = {
        ...mockTopic,
        userId: 1,
        comments: [{ userId: 2 }, { userId: 3 }, { userId: 2 }],
      };
      mockPrisma.topic.findFirst.mockResolvedValue(topicWithComments);
      mockPrisma.topic.delete.mockResolvedValue({});

      await service.deleteTopic(1, 'spam');

      expect(mockPrisma.topic.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      // 3 unique userIds: 1, 2, 3
      expect(mockNotificationService.create).toHaveBeenCalledTimes(3);
    });

    it('should throw NotFoundException if topic not found', async () => {
      mockPrisma.topic.findFirst.mockResolvedValue(null);
      await expect(service.deleteTopic(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('closeTopic', () => {
    it('should close topic for creator', async () => {
      mockPrisma.topic.findFirst.mockResolvedValue({ ...mockTopic, userId: 5 });
      mockPrisma.topic.update.mockResolvedValue({});

      const result = await service.closeTopic(1, 5, Role.UTILISATEUR);
      expect(result).toEqual({ success: true });
      expect(mockPrisma.topic.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { isClosed: true } });
    });

    it('should throw ForbiddenException if not creator nor admin', async () => {
      mockPrisma.topic.findFirst.mockResolvedValue({ ...mockTopic, userId: 99 });
      await expect(service.closeTopic(1, 5, Role.UTILISATEUR)).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin to close any topic', async () => {
      mockPrisma.topic.findFirst.mockResolvedValue({ ...mockTopic, userId: 99 });
      mockPrisma.topic.update.mockResolvedValue({});

      const result = await service.closeTopic(1, 1, Role.ADMIN);
      expect(result).toEqual({ success: true });
    });
  });

  describe('reopenTopic', () => {
    it('should reopen topic for creator', async () => {
      mockPrisma.topic.findFirst.mockResolvedValue({ ...mockTopic, userId: 5, isClosed: true });
      mockPrisma.topic.update.mockResolvedValue({});

      const result = await service.reopenTopic(1, 5, Role.UTILISATEUR);
      expect(result).toEqual({ success: true });
      expect(mockPrisma.topic.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { isClosed: false } });
    });
  });
});
