import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CommentService } from './comment.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { Role } from '../common/enums/role.enum';

const mockPrisma = {
  topic: { findFirst: jest.fn() },
  comment: {
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  user: { findUnique: jest.fn() },
  vote: { groupBy: jest.fn(), findMany: jest.fn() },
};

const mockNotificationService = {
  create: jest.fn().mockResolvedValue({}),
};

describe('CommentService', () => {
  let service: CommentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();
    service = module.get<CommentService>(CommentService);
    jest.clearAllMocks();
  });

  const now = new Date();
  const mockComment = {
    id: 1,
    content: 'Test comment',
    userId: 2,
    topicId: 10,
    parentId: null,
    status: 'visible',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    user: { id: 2, username: 'user2' },
  };

  const mockTopic = { id: 10, deletedAt: null, isClosed: false };

  describe('create', () => {
    it('should throw ForbiddenException if user is suspended', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 2, estSuspendu: true });
      await expect(service.create(10, 2, { content: 'Hello' })).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if topic does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 2, estSuspendu: false });
      mockPrisma.topic.findFirst.mockResolvedValue(null);
      await expect(service.create(10, 2, { content: 'Hello' })).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if topic is closed', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 2, estSuspendu: false });
      mockPrisma.topic.findFirst.mockResolvedValue({ ...mockTopic, isClosed: true });
      await expect(service.create(10, 2, { content: 'Hello' })).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if parent comment does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 2, estSuspendu: false });
      mockPrisma.topic.findFirst.mockResolvedValue(mockTopic);
      mockPrisma.comment.findFirst.mockResolvedValue(null);
      await expect(
        service.create(10, 2, { content: 'Reply', parentId: 999 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnprocessableEntityException when depth exceeds 3', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 2, estSuspendu: false });
      mockPrisma.topic.findFirst.mockResolvedValue(mockTopic);
      mockPrisma.comment.findFirst.mockResolvedValue({ id: 3, topicId: 10 });
      mockPrisma.comment.findUnique
        .mockResolvedValueOnce({ parentId: 2 })
        .mockResolvedValueOnce({ parentId: 1 })
        .mockResolvedValueOnce({ parentId: null });
      await expect(
        service.create(10, 2, { content: 'Too deep', parentId: 3 }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should create a comment successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 2, estSuspendu: false });
      mockPrisma.topic.findFirst.mockResolvedValue(mockTopic);
      mockPrisma.comment.create.mockResolvedValue(mockComment);
      const result = await service.create(10, 2, { content: 'Hello world' });
      expect(result.author).toEqual({ id: 2, pseudo: 'user2' });
    });
  });

  describe('update', () => {
    it('should throw NotFoundException if comment not found', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(null);
      await expect(
        service.update(10, 1, 2, Role.UTILISATEUR, { content: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if not author and not admin', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue({ ...mockComment, userId: 99 });
      await expect(
        service.update(10, 1, 2, Role.UTILISATEUR, { content: 'Updated' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update if user is admin', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue({ ...mockComment, userId: 99 });
      mockPrisma.comment.update.mockResolvedValue({ ...mockComment, content: 'Updated' });
      const result = await service.update(10, 1, 1, Role.ADMIN, { content: 'Updated' });
      expect(result).toBeDefined();
    });
  });

  describe('hideComment', () => {
    it('should set status to hidden and create notification', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(mockComment);
      mockPrisma.comment.update.mockResolvedValue({});

      const result = await service.hideComment(10, 1, 'spam');
      expect(result).toEqual({ success: true });
      expect(mockPrisma.comment.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { status: 'hidden' } });
      expect(mockNotificationService.create).toHaveBeenCalledWith(
        2,
        'Votre contenu a été masqué par un admin. Raison : spam',
        'spam',
      );
    });

    it('should send generic message when no reason', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(mockComment);
      mockPrisma.comment.update.mockResolvedValue({});

      await service.hideComment(10, 1);
      expect(mockNotificationService.create).toHaveBeenCalledWith(
        2,
        'Votre contenu a été masqué par un admin',
        undefined,
      );
    });
  });

  describe('showComment', () => {
    it('should set status to visible', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue({ ...mockComment, status: 'hidden' });
      mockPrisma.comment.update.mockResolvedValue({});

      const result = await service.showComment(10, 1);
      expect(result).toEqual({ success: true });
      expect(mockPrisma.comment.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { status: 'visible' } });
    });
  });

  describe('deleteComment', () => {
    it('should hard delete comment and create notification', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(mockComment);
      mockPrisma.comment.delete.mockResolvedValue({});

      const result = await service.deleteComment(10, 1, 'hors sujet');
      expect(result).toEqual({ success: true });
      expect(mockPrisma.comment.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockNotificationService.create).toHaveBeenCalledWith(
        2,
        'Votre contenu a été supprimé par un admin. Raison : hors sujet',
        'hors sujet',
      );
    });

    it('should throw NotFoundException if comment not found', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(null);
      await expect(service.deleteComment(10, 999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('selfDeleteComment', () => {
    it('should soft-delete own comment without notification', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(mockComment);
      mockPrisma.comment.update.mockResolvedValue({});

      const result = await service.selfDeleteComment(10, 1, 2);
      expect(result).toEqual({ success: true });
      expect(mockPrisma.comment.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { status: 'hidden' } });
      expect(mockNotificationService.create).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if not owner', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(mockComment);
      await expect(service.selfDeleteComment(10, 1, 99)).rejects.toThrow(ForbiddenException);
    });
  });
});
