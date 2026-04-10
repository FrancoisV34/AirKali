import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationService } from '../notification/notification.service';
import { CreateAlertDto } from './dto/create-alert.dto';
import { AlertPalier, AlertType } from '@prisma/client';

const COOLDOWN_MS = 72 * 60 * 60 * 1000; // 72 hours

const PALIER_SEUILS: Record<AlertPalier, number> = {
  AIR_MOYEN: 50,
  AIR_MAUVAIS: 100,
  AIR_TRES_MAUVAIS: 150,
  METEO_SEVERE: 0, // handled by specific conditions
};

const SEVERE_WEATHER_CODES = [65, 67, 75, 77, 82, 86, 95, 96, 99];

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private notificationService: NotificationService,
  ) {}

  // --- CRUD ---

  async getAlerts(userId: number) {
    return this.prisma.alert.findMany({
      where: { userId },
      include: {
        commune: { select: { id: true, nom: true, codePostal: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAlert(userId: number, dto: CreateAlertDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.estSuspendu) {
      throw new ForbiddenException('Compte suspendu');
    }

    // Validate palier matches type
    if (dto.type === 'AIR' && !dto.palier.startsWith('AIR_')) {
      throw new BadRequestException('Palier incompatible avec le type AIR');
    }
    if (dto.type === 'METEO' && dto.palier !== 'METEO_SEVERE') {
      throw new BadRequestException('Palier incompatible avec le type METEO');
    }

    // Check commune is in favorites
    const favori = await this.prisma.favori.findUnique({
      where: { userId_communeId: { userId, communeId: dto.communeId } },
    });
    if (!favori) {
      throw new BadRequestException('Cette commune n\'est pas dans vos favoris');
    }

    // Check max 3 alerts
    const count = await this.prisma.alert.count({ where: { userId } });
    if (count >= 3) {
      throw new BadRequestException('Limite de 3 alertes atteinte');
    }

    // Check uniqueness
    const existing = await this.prisma.alert.findUnique({
      where: { userId_communeId_type: { userId, communeId: dto.communeId, type: dto.type } },
    });
    if (existing) {
      throw new ConflictException('Une alerte existe deja pour ce type sur cette commune');
    }

    return this.prisma.alert.create({
      data: {
        userId,
        communeId: dto.communeId,
        type: dto.type,
        palier: dto.palier,
      },
      include: {
        commune: { select: { id: true, nom: true, codePostal: true } },
      },
    });
  }

  async toggleAlert(id: number, userId: number) {
    const alert = await this.prisma.alert.findFirst({ where: { id, userId } });
    if (!alert) throw new NotFoundException('Alerte introuvable');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.estSuspendu) throw new ForbiddenException('Compte suspendu');

    return this.prisma.alert.update({
      where: { id },
      data: { active: !alert.active },
      include: {
        commune: { select: { id: true, nom: true, codePostal: true } },
      },
    });
  }

  async deleteAlert(id: number, userId: number) {
    const alert = await this.prisma.alert.findFirst({ where: { id, userId } });
    if (!alert) throw new NotFoundException('Alerte introuvable');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.estSuspendu) throw new ForbiddenException('Compte suspendu');

    await this.prisma.alert.delete({ where: { id } });
    return { message: 'Alerte supprimee' };
  }

  async getHistory(userId: number) {
    return this.prisma.alertLog.findMany({
      where: { userId },
      include: {
        commune: { select: { id: true, nom: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  // --- CHECK ALERTS (called from collecte crons) ---

  async checkAirAlerts(communeId: number, aqi: number | null) {
    if (aqi == null) return;

    const commune = await this.prisma.commune.findUnique({
      where: { id: communeId },
      select: { id: true, nom: true },
    });
    if (!commune) return;

    // 1. Personal alerts
    const alerts = await this.prisma.alert.findMany({
      where: {
        communeId,
        type: 'AIR',
        active: true,
        user: { estSuspendu: false },
      },
      include: { user: { select: { id: true, email: true, prenom: true } } },
    });

    for (const alert of alerts) {
      const seuil = PALIER_SEUILS[alert.palier];
      if (aqi > seuil) {
        await this._triggerAlert(alert, commune.nom, aqi, seuil, 'AQI', false);
      } else if (!alert.wasUnderThreshold) {
        await this.prisma.alert.update({
          where: { id: alert.id },
          data: { wasUnderThreshold: true },
        });
      }
    }

    // 2. Official alerts (AQI > 100)
    if (aqi > 100) {
      await this._triggerOfficialAlerts(communeId, commune.nom, 'AIR', aqi, 100, 'AQI');
    }
  }

  async checkMeteoAlerts(
    communeId: number,
    data: { temperature: number | null; vitesseVent: number | null; weatherCode: number | null },
  ) {
    const isSevere = this._isMeteoSevere(data);
    if (!isSevere.triggered) return;

    const commune = await this.prisma.commune.findUnique({
      where: { id: communeId },
      select: { id: true, nom: true },
    });
    if (!commune) return;

    // 1. Personal alerts
    const alerts = await this.prisma.alert.findMany({
      where: {
        communeId,
        type: 'METEO',
        active: true,
        user: { estSuspendu: false },
      },
      include: { user: { select: { id: true, email: true, prenom: true } } },
    });

    for (const alert of alerts) {
      await this._triggerAlert(
        alert, commune.nom, isSevere.valeur, isSevere.seuil, isSevere.unite, false,
      );
    }

    // 2. Official alerts
    await this._triggerOfficialAlerts(
      communeId, commune.nom, 'METEO', isSevere.valeur, isSevere.seuil, isSevere.unite,
    );
  }

  async checkMeteoUnderThreshold(
    communeId: number,
    data: { temperature: number | null; vitesseVent: number | null; weatherCode: number | null },
  ) {
    const isSevere = this._isMeteoSevere(data);
    if (isSevere.triggered) return;

    const alerts = await this.prisma.alert.findMany({
      where: {
        communeId,
        type: 'METEO',
        active: true,
        wasUnderThreshold: false,
      },
    });

    if (alerts.length > 0) {
      await this.prisma.alert.updateMany({
        where: { id: { in: alerts.map((a) => a.id) } },
        data: { wasUnderThreshold: true },
      });
    }
  }

  // --- PURGE ---

  async purgeOldLogs() {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.alertLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    if (result.count > 0) {
      this.logger.log(`Purge: ${result.count} alert logs supprimes (> 30j)`);
    }
  }

  // --- PRIVATE ---

  private async _triggerAlert(
    alert: { id: number; communeId: number; wasUnderThreshold: boolean; lastTriggeredAt: Date | null; palier: AlertPalier; user: { id: number; email: string; prenom: string } },
    communeName: string,
    valeur: number,
    seuil: number,
    unite: string,
    officielle: boolean,
  ) {
    // Check cooldown
    if (!alert.wasUnderThreshold) return;
    if (alert.lastTriggeredAt && Date.now() - alert.lastTriggeredAt.getTime() < COOLDOWN_MS) return;

    const type = alert.palier.startsWith('AIR') ? 'AIR' : 'METEO';

    // Create log
    const log = await this.prisma.alertLog.create({
      data: {
        alertId: alert.id,
        userId: alert.user.id,
        communeId: alert.communeId,
        type: type as AlertType,
        palier: alert.palier,
        valeurMesuree: valeur,
        seuilDeclenche: seuil,
        unite,
        officielle,
      },
    });

    // Send email
    let emailSent = false;
    try {
      await this.mailService.sendAlertEmail(alert.user.email, {
        communeName,
        type: type as 'AIR' | 'METEO',
        valeur,
        seuil,
        unite,
        officielle,
        communeId: alert.communeId,
      });
      emailSent = true;
    } catch (err) {
      this.logger.error(`Echec envoi email alerte a ${alert.user.email}: ${String(err)}`);
    }

    // Send notification in-app
    const typeLabel = type === 'AIR' ? 'qualite de l\'air' : 'meteo';
    await this.notificationService.create(
      alert.user.id,
      `Alerte ${typeLabel} - ${communeName} : ${valeur} ${unite} (seuil: ${seuil} ${unite})`,
    );

    // Update alert state
    await this.prisma.alert.update({
      where: { id: alert.id },
      data: { wasUnderThreshold: false, lastTriggeredAt: new Date() },
    });

    await this.prisma.alertLog.update({
      where: { id: log.id },
      data: { emailSent, notificationSent: true },
    });
  }

  private async _triggerOfficialAlerts(
    communeId: number,
    communeName: string,
    type: 'AIR' | 'METEO',
    valeur: number,
    seuil: number,
    unite: string,
  ) {
    // Find all users with this commune in favorites who are not suspended
    // and haven't been alerted in the last 72h for this type
    const favUsers = await this.prisma.favori.findMany({
      where: { communeId, user: { estSuspendu: false } },
      include: { user: { select: { id: true, email: true, prenom: true } } },
    });

    for (const fav of favUsers) {
      // Check if user already has a personal alert for this type (already handled above)
      const personalAlert = await this.prisma.alert.findUnique({
        where: { userId_communeId_type: { userId: fav.userId, communeId, type: type as AlertType } },
      });
      if (personalAlert) continue; // Already processed via personal alert flow

      // Check cooldown via AlertLog
      const recentLog = await this.prisma.alertLog.findFirst({
        where: {
          userId: fav.userId,
          communeId,
          type: type as AlertType,
          officielle: true,
          createdAt: { gt: new Date(Date.now() - COOLDOWN_MS) },
        },
      });
      if (recentLog) continue;

      // Create log
      const log = await this.prisma.alertLog.create({
        data: {
          userId: fav.userId,
          communeId,
          type: type as AlertType,
          valeurMesuree: valeur,
          seuilDeclenche: seuil,
          unite,
          officielle: true,
        },
      });

      // Send email
      let emailSent = false;
      try {
        await this.mailService.sendAlertEmail(fav.user.email, {
          communeName,
          type,
          valeur,
          seuil,
          unite,
          officielle: true,
          communeId,
        });
        emailSent = true;
      } catch (err) {
        this.logger.error(`Echec envoi email officiel a ${fav.user.email}: ${String(err)}`);
      }

      // Notification in-app
      const typeLabel = type === 'AIR' ? 'qualite de l\'air' : 'meteo';
      await this.notificationService.create(
        fav.userId,
        `Alerte officielle ${typeLabel} - ${communeName} : ${valeur} ${unite} (seuil: ${seuil} ${unite})`,
      );

      await this.prisma.alertLog.update({
        where: { id: log.id },
        data: { emailSent, notificationSent: true },
      });
    }
  }

  private _isMeteoSevere(data: {
    temperature: number | null;
    vitesseVent: number | null;
    weatherCode: number | null;
  }): { triggered: boolean; valeur: number; seuil: number; unite: string } {
    if (data.vitesseVent != null && data.vitesseVent > 60) {
      return { triggered: true, valeur: data.vitesseVent, seuil: 60, unite: 'km/h' };
    }
    if (data.temperature != null && data.temperature > 35) {
      return { triggered: true, valeur: data.temperature, seuil: 35, unite: '°C' };
    }
    if (data.temperature != null && data.temperature < -10) {
      return { triggered: true, valeur: data.temperature, seuil: -10, unite: '°C' };
    }
    if (data.weatherCode != null && SEVERE_WEATHER_CODES.includes(data.weatherCode)) {
      return { triggered: true, valeur: data.weatherCode, seuil: 0, unite: 'code WMO' };
    }
    return { triggered: false, valeur: 0, seuil: 0, unite: '' };
  }
}
