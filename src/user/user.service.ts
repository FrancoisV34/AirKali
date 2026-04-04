import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        nom: true,
        prenom: true,
        role: true,
        adressePostale: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    if (dto.email || dto.username) {
      const conditions: Array<{ email?: string; username?: string }> = [];
      if (dto.email) conditions.push({ email: dto.email });
      if (dto.username) conditions.push({ username: dto.username });

      const existing = await this.prisma.user.findFirst({
        where: {
          OR: conditions,
          NOT: { id: userId },
        },
      });

      if (existing) {
        if (dto.email && existing.email === dto.email) {
          throw new ConflictException('Email déjà utilisé');
        }
        throw new ConflictException('Username déjà utilisé');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.nom !== undefined && { nom: dto.nom }),
        ...(dto.prenom !== undefined && { prenom: dto.prenom }),
        ...(dto.username !== undefined && { username: dto.username }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.adressePostale !== undefined && {
          adressePostale: dto.adressePostale,
        }),
      },
      select: {
        id: true,
        email: true,
        username: true,
        nom: true,
        prenom: true,
        role: true,
        adressePostale: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }
}
