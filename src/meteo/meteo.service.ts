import {
  BadRequestException,
  BadGatewayException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MeteoApiService } from '../collecte/meteo-api.service';

@Injectable()
export class MeteoService {
  private readonly logger = new Logger(MeteoService.name);

  constructor(
    private prisma: PrismaService,
    private meteoApi: MeteoApiService,
  ) {}

  async getCurrent(communeId: number) {
    const commune = await this.prisma.commune.findUnique({
      where: { id: communeId },
    });

    if (!commune) {
      throw new NotFoundException('Commune introuvable');
    }

    try {
      const data = await this.meteoApi.fetchCurrent(
        Number(commune.latitude),
        Number(commune.longitude),
      );

      return {
        communeId: commune.id,
        communeNom: commune.nom,
        ...data,
      };
    } catch (error) {
      this.logger.error(
        `Erreur API météo pour commune ${communeId}`,
        error,
      );
      throw new BadGatewayException(
        "Erreur lors de l'appel à l'API météo",
      );
    }
  }

  async getHistory(communeId: number, from: string, to: string) {
    const commune = await this.prisma.commune.findUnique({
      where: { id: communeId },
    });

    if (!commune) {
      throw new NotFoundException('Commune introuvable');
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestException('Dates invalides');
    }

    if (toDate < fromDate) {
      throw new BadRequestException(
        'La date de fin doit être postérieure à la date de début',
      );
    }

    const diffDays =
      (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 90) {
      throw new BadRequestException('La plage maximale est de 90 jours');
    }

    const data = await this.prisma.donneeMeteo.findMany({
      where: {
        communeId,
        dateHeure: {
          gte: fromDate,
          lte: toDate,
        },
      },
      select: {
        temperature: true,
        pression: true,
        humidite: true,
        meteoCiel: true,
        vitesseVent: true,
        dateHeure: true,
      },
      orderBy: { dateHeure: 'asc' },
    });

    return {
      communeId: commune.id,
      communeNom: commune.nom,
      from,
      to,
      data,
    };
  }
}
