import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateManualAlertDto } from './dto/create-manual-alert.dto';

@Injectable()
export class ManualAlertService {
  constructor(private prisma: PrismaService) {}

  async create(adminId: number, dto: CreateManualAlertDto) {
    const commune = await this.prisma.commune.findUnique({
      where: { id: dto.communeId },
    });
    if (!commune) {
      throw new NotFoundException('Commune introuvable');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return this.prisma.manualAlert.create({
      data: {
        communeId: dto.communeId,
        palier: dto.palier,
        message: dto.message || null,
        createdBy: adminId,
        expiresAt,
      },
      include: { commune: { select: { nom: true } } },
    });
  }

  async findAll() {
    const alerts = await this.prisma.manualAlert.findMany({
      include: {
        commune: { select: { nom: true } },
        admin: { select: { nom: true, prenom: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return alerts.map((a) => ({
      ...a,
      statut: this.getStatut(a),
    }));
  }

  async close(id: number) {
    const alert = await this.prisma.manualAlert.findUnique({ where: { id } });
    if (!alert) {
      throw new NotFoundException('Alerte introuvable');
    }
    if (alert.closedAt) {
      throw new BadRequestException('Cette alerte est déjà clôturée');
    }

    return this.prisma.manualAlert.update({
      where: { id },
      data: { closedAt: new Date() },
      include: { commune: { select: { nom: true } } },
    });
  }

  async getActiveByCommune(communeId: number) {
    const now = new Date();
    return this.prisma.manualAlert.findMany({
      where: {
        communeId,
        closedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private getStatut(alert: { closedAt: Date | null; expiresAt: Date }): string {
    if (alert.closedAt) return 'Clôturée';
    if (new Date() > alert.expiresAt) return 'Expirée';
    return 'Active';
  }
}
