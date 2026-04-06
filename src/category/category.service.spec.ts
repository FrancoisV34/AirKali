import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CategoryService } from './category.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  category: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
};

describe('CategoryService', () => {
  let service: CategoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<CategoryService>(CategoryService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all categories ordered by createdAt', async () => {
      const cats = [{ id: 1, name: 'Général', createdAt: new Date() }];
      mockPrisma.category.findMany.mockResolvedValue(cats);
      const result = await service.findAll();
      expect(result).toEqual(cats);
      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'asc' } });
    });
  });

  describe('create', () => {
    it('should create a category when name is unique', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);
      const created = { id: 1, name: 'Test', createdAt: new Date() };
      mockPrisma.category.create.mockResolvedValue(created);

      const result = await service.create({ name: '  Test  ' });
      expect(result).toEqual(created);
      expect(mockPrisma.category.create).toHaveBeenCalledWith({ data: { name: 'Test' } });
    });

    it('should throw ConflictException when name already exists', async () => {
      mockPrisma.category.findUnique.mockResolvedValue({ id: 1, name: 'Test' });
      await expect(service.create({ name: 'Test' })).rejects.toThrow(ConflictException);
    });
  });
});
