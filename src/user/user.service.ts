import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateCommuneDto } from './dto/update-commune.dto';
import { getBoundingBox, haversineDistance } from '../common/utils/haversine';

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
        communeId: true,
        commune: {
          select: { id: true, nom: true, codePostal: true },
        },
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
        communeId: true,
        commune: {
          select: { id: true, nom: true, codePostal: true },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    return updated;
  }

  async updateCommune(userId: number, dto: UpdateCommuneDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, communeId: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Suppression de la commune de référence
    if (dto.communeId === null) {
      return this.prisma.user.update({
        where: { id: userId },
        data: { communeId: null, adressePostale: null },
        select: {
          id: true, email: true, username: true, nom: true, prenom: true,
          role: true, adressePostale: true, communeId: true,
          commune: { select: { id: true, nom: true, codePostal: true } },
          createdAt: true, updatedAt: true,
        },
      });
    }

    // Définition ou changement de commune
    if (dto.communeId !== undefined) {
      const commune = await this.prisma.commune.findUnique({
        where: { id: dto.communeId },
      });

      if (!commune || !commune.active) {
        throw new BadRequestException('Commune introuvable ou inactive');
      }

      // Retirer l'ancienne commune des favoris si différente
      if (user.communeId && user.communeId !== dto.communeId) {
        await this.prisma.favori.deleteMany({
          where: { userId, communeId: user.communeId },
        });
      }

      // Mettre à jour le profil
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: {
          communeId: dto.communeId,
          ...(dto.codePostal !== undefined && { adressePostale: dto.codePostal }),
        },
        select: {
          id: true, email: true, username: true, nom: true, prenom: true,
          role: true, adressePostale: true, communeId: true,
          commune: { select: { id: true, nom: true, codePostal: true } },
          createdAt: true, updatedAt: true,
        },
      });

      // Upsert favori (ignorer si déjà présent)
      const existingFavori = await this.prisma.favori.findUnique({
        where: { userId_communeId: { userId, communeId: dto.communeId } },
      });

      if (!existingFavori) {
        await this.prisma.favori.create({ data: { userId, communeId: dto.communeId } });
        await this._activateCommune(commune);
      }

      return updated;
    }

    throw new BadRequestException('communeId est requis');
  }

  async getSuspensionHistory(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.suspensionLog.findMany({
      where: { userId },
      select: {
        id: true,
        action: true,
        motif: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async _activateCommune(commune: { id: number; latitude: unknown; longitude: unknown }) {
    const lat = Number(commune.latitude);
    const lng = Number(commune.longitude);

    await this.prisma.commune.update({
      where: { id: commune.id },
      data: { active: true, activatedAt: new Date() },
    });

    const box = getBoundingBox(lat, lng, 10);
    const candidates = await this.prisma.commune.findMany({
      where: {
        id: { not: commune.id },
        active: false,
        latitude: { gte: box.minLat, lte: box.maxLat },
        longitude: { gte: box.minLng, lte: box.maxLng },
      },
    });

    const toActivate = candidates.filter(
      (c) => haversineDistance(lat, lng, Number(c.latitude), Number(c.longitude)) <= 10,
    );

    if (toActivate.length > 0) {
      await this.prisma.commune.updateMany({
        where: { id: { in: toActivate.map((c) => c.id) } },
        data: { active: true, activatedAt: new Date() },
      });
    }
  }
}
