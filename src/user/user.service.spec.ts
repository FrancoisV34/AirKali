import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';

const mockProfile = {
  id: 1,
  email: 'test@test.com',
  username: 'testuser',
  nom: 'User',
  prenom: 'Test',
  role: 'UTILISATEUR',
  adressePostale: null,
  communeId: null,
  commune: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

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
            commune: {
              findUnique: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              findMany: jest.fn(),
            },
            favori: {
              findUnique: jest.fn(),
              create: jest.fn(),
              deleteMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('getProfile', () => {
    it('should return user profile with communeId and commune', async () => {
      const mockUser = { ...mockProfile, communeId: 42, commune: { id: 42, nom: 'Lyon', codePostal: '69001' } };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.getProfile(1);
      expect(result).toEqual(mockUser);
      expect(result).not.toHaveProperty('password');
      expect(result.communeId).toBe(42);
      expect(result.commune).toBeDefined();
    });

    it('should return null communeId when not set', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockProfile);
      const result = await service.getProfile(1);
      expect(result.communeId).toBeNull();
      expect(result.commune).toBeNull();
    });

    it('should throw NotFoundException if user does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.getProfile(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockProfile);

      const result = await service.updateProfile(1, { nom: 'Nouveau' });
      expect(result).toEqual(mockProfile);
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
      (prisma.user.update as jest.Mock).mockResolvedValue(mockProfile);
      await service.updateProfile(1, { nom: 'Nouveau' });
      const updateCall = (prisma.user.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data).toEqual({ nom: 'Nouveau' });
    });

    it('should skip uniqueness check when no email/username provided', async () => {
      (prisma.user.update as jest.Mock).mockResolvedValue(mockProfile);
      await service.updateProfile(1, { prenom: 'Nouveau' });
      expect(prisma.user.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('updateCommune', () => {
    const mockCommune = {
      id: 42,
      nom: 'Lyon',
      codePostal: '69001',
      active: true,
      latitude: 45.748,
      longitude: 4.846,
    };

    const updatedProfile = { ...mockProfile, communeId: 42, adressePostale: '69001' };

    it('should set commune and create favori when commune not already in favorites', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1, communeId: null });
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue(mockCommune);
      (prisma.user.update as jest.Mock).mockResolvedValue(updatedProfile);
      (prisma.favori.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.favori.create as jest.Mock).mockResolvedValue({});
      (prisma.commune.update as jest.Mock).mockResolvedValue({});
      (prisma.commune.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.updateCommune(1, { communeId: 42, codePostal: '69001' });

      expect(result.communeId).toBe(42);
      expect(prisma.favori.create).toHaveBeenCalledWith({ data: { userId: 1, communeId: 42 } });
    });

    it('should not create duplicate favori if commune already in favorites', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1, communeId: null });
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue(mockCommune);
      (prisma.user.update as jest.Mock).mockResolvedValue(updatedProfile);
      (prisma.favori.findUnique as jest.Mock).mockResolvedValue({ id: 10 });

      const result = await service.updateCommune(1, { communeId: 42 });

      expect(result.communeId).toBe(42);
      expect(prisma.favori.create).not.toHaveBeenCalled();
    });

    it('should remove old favori when changing commune', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1, communeId: 10 });
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue(mockCommune);
      (prisma.user.update as jest.Mock).mockResolvedValue(updatedProfile);
      (prisma.favori.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.favori.create as jest.Mock).mockResolvedValue({});
      (prisma.commune.update as jest.Mock).mockResolvedValue({});
      (prisma.commune.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.favori.deleteMany as jest.Mock).mockResolvedValue({});

      await service.updateCommune(1, { communeId: 42 });

      expect(prisma.favori.deleteMany).toHaveBeenCalledWith({
        where: { userId: 1, communeId: 10 },
      });
    });

    it('should not remove favori when commune is unchanged', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1, communeId: 42 });
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue(mockCommune);
      (prisma.user.update as jest.Mock).mockResolvedValue(updatedProfile);
      (prisma.favori.findUnique as jest.Mock).mockResolvedValue({ id: 10 });

      await service.updateCommune(1, { communeId: 42 });

      expect(prisma.favori.deleteMany).not.toHaveBeenCalled();
    });

    it('should clear communeId when communeId is null', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1, communeId: 42 });
      (prisma.user.update as jest.Mock).mockResolvedValue({ ...mockProfile, communeId: null });

      const result = await service.updateCommune(1, { communeId: null });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { communeId: null, adressePostale: null } }),
      );
      expect(result.communeId).toBeNull();
    });

    it('should throw BadRequestException for inactive commune', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1, communeId: null });
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue({ ...mockCommune, active: false });

      await expect(service.updateCommune(1, { communeId: 42 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for non-existent commune', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1, communeId: null });
      (prisma.commune.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.updateCommune(1, { communeId: 999 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.updateCommune(999, { communeId: 42 })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
