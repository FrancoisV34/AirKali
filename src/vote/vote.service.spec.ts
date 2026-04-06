import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { VoteService } from './vote.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  user: { findUnique: jest.fn() },
  topic: { findFirst: jest.fn() },
  comment: { findFirst: jest.fn() },
  vote: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    aggregate: jest.fn(),
  },
};

describe('VoteService', () => {
  let service: VoteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoteService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<VoteService>(VoteService);
    jest.clearAllMocks();
  });

  const activeUser = { id: 1, estSuspendu: false };
  const suspendedUser = { id: 2, estSuspendu: true };
  const dto = { targetType: 'TOPIC' as const, targetId: 10, value: 1 as const };

  describe('vote', () => {
    it('should throw NotFoundException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.vote(1, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is suspended', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(suspendedUser);
      await expect(service.vote(2, dto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if target does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(activeUser);
      mockPrisma.topic.findFirst.mockResolvedValue(null);
      await expect(service.vote(1, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for auto-vote', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(activeUser);
      mockPrisma.topic.findFirst.mockResolvedValue({ userId: 1 }); // same as voter
      await expect(service.vote(1, dto)).rejects.toThrow(ForbiddenException);
    });

    it('should create a new vote when none exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(activeUser);
      mockPrisma.topic.findFirst.mockResolvedValue({ userId: 99 });
      mockPrisma.vote.findUnique.mockResolvedValue(null);
      mockPrisma.vote.create.mockResolvedValue({ id: 5, value: 1 });
      mockPrisma.vote.aggregate.mockResolvedValue({ _sum: { value: 3 } });

      const result = await service.vote(1, dto);
      expect(mockPrisma.vote.create).toHaveBeenCalled();
      expect(result.vote).toEqual({ id: 5, value: 1 });
      expect(result.newScore).toBe(3);
    });

    it('should delete vote when same value is voted again (toggle)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(activeUser);
      mockPrisma.topic.findFirst.mockResolvedValue({ userId: 99 });
      mockPrisma.vote.findUnique.mockResolvedValue({ id: 5, value: 1 });
      mockPrisma.vote.delete.mockResolvedValue({});
      mockPrisma.vote.aggregate.mockResolvedValue({ _sum: { value: 0 } });

      const result = await service.vote(1, dto);
      expect(mockPrisma.vote.delete).toHaveBeenCalledWith({ where: { id: 5 } });
      expect(result.vote).toBeNull();
    });

    it('should update vote when opposite value is voted (flip)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(activeUser);
      mockPrisma.topic.findFirst.mockResolvedValue({ userId: 99 });
      mockPrisma.vote.findUnique.mockResolvedValue({ id: 5, value: -1 });
      mockPrisma.vote.update.mockResolvedValue({ id: 5, value: 1 });
      mockPrisma.vote.aggregate.mockResolvedValue({ _sum: { value: 2 } });

      const result = await service.vote(1, dto);
      expect(mockPrisma.vote.update).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { value: 1 },
      });
      expect(result.vote).toEqual({ id: 5, value: 1 });
    });
  });
});
