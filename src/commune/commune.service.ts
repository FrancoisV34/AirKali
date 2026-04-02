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
