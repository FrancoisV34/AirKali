import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mocked-jwt-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@test.com',
      username: 'testuser',
      nom: 'User',
      prenom: 'Test',
      password: 'Password1!',
    };

    it('should create a user and return a JWT', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 1,
        email: registerDto.email,
        username: registerDto.username,
        role: 'USER',
      });

      const result = await service.register(registerDto);

      expect(result).toEqual({ access_token: 'mocked-jwt-token' });
      expect(prisma.user.create).toHaveBeenCalled();
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 1,
        email: registerDto.email,
        role: 'USER',
      });
    });

    it('should throw ConflictException if email exists', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        email: registerDto.email,
        username: 'other',
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException if username exists', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        email: 'other@test.com',
        username: registerDto.username,
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should hash the password with bcrypt salt rounds 12', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 1,
        email: registerDto.email,
        username: registerDto.username,
        role: 'USER',
      });

      await service.register(registerDto);

      const createCall = (prisma.user.create as jest.Mock).mock.calls[0][0];
      const hashedPassword = createCall.data.password;
      expect(hashedPassword).not.toBe(registerDto.password);
      // bcrypt hash encodes rounds in the hash: $2b$12$...
      expect(hashedPassword).toMatch(/^\$2[aby]\$12\$/);
      const isValid = await bcrypt.compare(registerDto.password, hashedPassword);
      expect(isValid).toBe(true);
    });
  });

  describe('login', () => {
    const loginDto = { email: 'test@test.com', password: 'password123' };

    it('should return a JWT on valid credentials', async () => {
      const hashedPassword = await bcrypt.hash(loginDto.password, 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        email: loginDto.email,
        password: hashedPassword,
        role: 'USER',
      });

      const result = await service.login(loginDto);

      expect(result).toEqual({ access_token: 'mocked-jwt-token' });
    });

    it('should throw UnauthorizedException if email not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is wrong', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        email: loginDto.email,
        password: await bcrypt.hash('wrongpassword', 10),
        role: 'USER',
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
