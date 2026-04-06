import { ForbiddenException, HttpException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TopicService } from './topic.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../common/enums/role.enum';

const mockPrisma = {
  topic: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
  category: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  comment: { groupBy: jest.fn() },
  vote: { groupBy: jest.fn(), aggregate: jest.fn(), findUnique: jest.fn() },
};

describe('TopicService', () => {
  let service: TopicService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TopicService,
        { provide: PrismaService, useValue: mockPrisma },
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
});
