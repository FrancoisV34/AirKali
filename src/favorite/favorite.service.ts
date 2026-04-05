import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  haversineDistance,
  getBoundingBox,
} from '../common/utils/haversine';

@Injectable()
export class FavoriteService {
  constructor(private prisma: PrismaService) {}

  async getFavorites(userId: number) {
    return this.prisma.favori.findMany({
      where: { userId },
      include: {
        commune: {
          select: {
            id: true,
            nom: true,
            codePostal: true,
            codeInsee: true,
            latitude: true,
            longitude: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addFavorite(userId: number, communeId: number) {
    const commune = await this.prisma.commune.findUnique({
      where: { id: communeId },
    });

    if (!commune) {
      throw new NotFoundException('Commune introuvable');
    }

    const count = await this.prisma.favori.count({ where: { userId } });
    if (count >= 10) {
      throw new BadRequestException('Limite de 10 favoris atteinte');
    }

    const existing = await this.prisma.favori.findUnique({
      where: { userId_communeId: { userId, communeId } },
    });

    if (existing) {
      throw new ConflictException('Cette commune est déjà en favori');
    }

    const favori = await this.prisma.favori.create({
      data: { userId, communeId },
      include: {
        commune: {
          select: {
            id: true,
            nom: true,
            codePostal: true,
            codeInsee: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    await this.activateCommuneAndNeighbors(commune);

    return favori;
  }

  async removeFavorite(userId: number, communeId: number) {
    const favori = await this.prisma.favori.findUnique({
      where: { userId_communeId: { userId, communeId } },
    });

    if (!favori) {
      throw new NotFoundException('Favori introuvable');
    }

    await this.prisma.favori.delete({
      where: { id: favori.id },
    });

    await this.deactivateIfNoMoreFavorites(communeId);

    return { message: 'Favori supprimé' };
  }

  private async activateCommuneAndNeighbors(commune: {
    id: number;
    latitude: unknown;
    longitude: unknown;
  }) {
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
      (c) =>
        haversineDistance(lat, lng, Number(c.latitude), Number(c.longitude)) <=
        10,
    );

    if (toActivate.length > 0) {
      await this.prisma.commune.updateMany({
        where: { id: { in: toActivate.map((c) => c.id) } },
        data: { active: true, activatedAt: new Date() },
      });
    }
  }

  private async deactivateIfNoMoreFavorites(communeId: number) {
    const commune = await this.prisma.commune.findUnique({
      where: { id: communeId },
    });

    if (!commune) return;

    const remainingFavorites = await this.prisma.favori.count({
      where: { communeId },
    });

    if (remainingFavorites === 0) {
      await this.prisma.commune.update({
        where: { id: communeId },
        data: { active: false, activatedAt: null },
      });

      const lat = Number(commune.latitude);
      const lng = Number(commune.longitude);
      const box = getBoundingBox(lat, lng, 10);

      const neighbors = await this.prisma.commune.findMany({
        where: {
          id: { not: communeId },
          active: true,
          latitude: { gte: box.minLat, lte: box.maxLat },
          longitude: { gte: box.minLng, lte: box.maxLng },
        },
      });

      for (const neighbor of neighbors) {
        const dist = haversineDistance(
          lat,
          lng,
          Number(neighbor.latitude),
          Number(neighbor.longitude),
        );
        if (dist <= 10) {
          const neighborFavCount = await this.prisma.favori.count({
            where: { communeId: neighbor.id },
          });
          if (neighborFavCount === 0) {
            await this.prisma.commune.update({
              where: { id: neighbor.id },
              data: { active: false, activatedAt: null },
            });
          }
        }
      }
    }
  }
}
