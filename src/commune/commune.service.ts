import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommuneService {
  constructor(private prisma: PrismaService) {}

  async search(query: string) {
    if (!query || query.length < 2) {
      throw new BadRequestException(
        'Le paramètre search doit contenir au moins 2 caractères',
      );
    }

    return this.prisma.commune.findMany({
      where: {
        OR: [
          { nom: { contains: query } },
          { codePostal: { startsWith: query } },
        ],
      },
      select: {
        id: true,
        nom: true,
        codePostal: true,
        codeInsee: true,
        population: true,
        latitude: true,
        longitude: true,
      },
      take: 20,
      orderBy: { nom: 'asc' },
    });
  }

  async getActiveCommunes(page: number = 1, limit: number = 50) {
    const take = Math.min(limit, 50);
    const skip = (page - 1) * take;

    const [data, total] = await Promise.all([
      this.prisma.commune.findMany({
        where: { active: true },
        select: {
          id: true,
          nom: true,
          codePostal: true,
          codeInsee: true,
          latitude: true,
          longitude: true,
          population: true,
          donneesAir: {
            select: { indiceQualite: true, dateHeure: true },
            orderBy: { dateHeure: 'desc' },
            take: 1,
          },
        },
        skip,
        take,
        orderBy: { nom: 'asc' },
      }),
      this.prisma.commune.count({ where: { active: true } }),
    ]);

    return {
      data: data.map((c) => ({
        id: c.id,
        nom: c.nom,
        codePostal: c.codePostal,
        codeInsee: c.codeInsee,
        latitude: c.latitude,
        longitude: c.longitude,
        population: c.population,
        derniereQualiteAir: c.donneesAir[0]
          ? {
              europeanAqi: c.donneesAir[0].indiceQualite,
              dateHeure: c.donneesAir[0].dateHeure,
            }
          : null,
      })),
      total,
      page,
      limit: take,
    };
  }

  async findByCodePostal(codePostal: string) {
    if (!/^\d{5}$/.test(codePostal)) {
      throw new BadRequestException('Le code postal doit contenir exactement 5 chiffres');
    }

    return this.prisma.commune.findMany({
      where: { codePostal },
      select: {
        id: true,
        nom: true,
        codePostal: true,
        codeInsee: true,
      },
      orderBy: { nom: 'asc' },
    });
  }

  async findById(id: number) {
    const commune = await this.prisma.commune.findUnique({
      where: { id },
      select: {
        id: true,
        nom: true,
        codePostal: true,
        codeInsee: true,
        population: true,
        latitude: true,
        longitude: true,
        active: true,
      },
    });

    if (!commune) {
      throw new NotFoundException('Commune introuvable');
    }

    return commune;
  }
}
