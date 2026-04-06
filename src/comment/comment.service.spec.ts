import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CommentService } from './comment.service';
import { PrismaService } from '../prisma/prisma.service';
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
  },
  user: { findUnique: jest.fn() },
  vote: { groupBy: jest.fn(), findMany: jest.fn() },
};

describe('CommentService', () => {
  let service: CommentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        { provide: PrismaService, useValue: mockPrisma },
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
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    user: { id: 2, username: 'user2' },
  };

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

    it('should throw NotFoundException if parent comment does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 2, estSuspendu: false });
      mockPrisma.topic.findFirst.mockResolvedValue({ id: 10 });
      mockPrisma.comment.findFirst.mockResolvedValue(null);
      await expect(
        service.create(10, 2, { content: 'Reply', parentId: 999 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnprocessableEntityException when depth exceeds 3', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 2, estSuspendu: false });
      mockPrisma.topic.findFirst.mockResolvedValue({ id: 10 });
      mockPrisma.comment.findFirst.mockResolvedValue({ id: 3, topicId: 10 });
      // Simulate depth 3: comment 3 has parent 2, which has parent 1, which has no parent
      mockPrisma.comment.findUnique
        .mockResolvedValueOnce({ parentId: 2 }) // depth count: parentId exists → depth goes up
        .mockResolvedValueOnce({ parentId: 1 })
        .mockResolvedValueOnce({ parentId: null });
      await expect(
        service.create(10, 2, { content: 'Too deep', parentId: 3 }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('should create a comment successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 2, estSuspendu: false });
      mockPrisma.topic.findFirst.mockResolvedValue({ id: 10 });
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
});
