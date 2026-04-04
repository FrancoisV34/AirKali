import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getProfile', () => {
    it('should return user profile without password', async () => {
      const mockUser = {
        id: 1,
        email: 'test@test.com',
        username: 'testuser',
        nom: 'User',
        prenom: 'Test',
        role: 'UTILISATEUR',
        adressePostale: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getProfile(1);

      expect(result).toEqual(mockUser);
      expect(result).not.toHaveProperty('password');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getProfile(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    const mockUpdated = {
      id: 1,
      email: 'test@test.com',
      username: 'testuser',
      nom: 'Nouveau',
      prenom: 'Test',
      role: 'UTILISATEUR',
      adressePostale: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should update profile successfully', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUpdated);

      const result = await service.updateProfile(1, { nom: 'Nouveau' });

      expect(result).toEqual(mockUpdated);
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already used', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 2,
        email: 'taken@test.com',
        username: 'other',
      });

      await expect(
        service.updateProfile(1, { email: 'taken@test.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if username already used', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 2,
        email: 'other@test.com',
        username: 'taken',
      });

      await expect(
        service.updateProfile(1, { username: 'taken' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should update only provided fields', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUpdated);

      await service.updateProfile(1, { nom: 'Nouveau' });

      const updateCall = (prisma.user.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data).toEqual({ nom: 'Nouveau' });
    });

    it('should skip uniqueness check when no email/username provided', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUpdated);

      await service.updateProfile(1, { prenom: 'Nouveau' });

      expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });
  });
});
