import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AirQualityApiService } from './air-quality-api.service';
import { MeteoApiService } from './meteo-api.service';

@Injectable()
export class CollecteService {
  private readonly logger = new Logger(CollecteService.name);

  constructor(
    private prisma: PrismaService,
    private airQualityApi: AirQualityApiService,
    private meteoApi: MeteoApiService,
    private httpService: HttpService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async collecteAir() {
    this.logger.log('Démarrage collecte qualité air');
    const start = Date.now();
    let communesTraitees = 0;
    let communesErreur = 0;

    const communes = await this.prisma.commune.findMany({
      where: { active: true },
    });

    for (const commune of communes) {
      try {
        const data = await this.airQualityApi.fetchCurrent(
          Number(commune.latitude),
          Number(commune.longitude),
        );

        await this.prisma.donneeAir.create({
          data: {
            communeId: commune.id,
            ozone: data.ozone,
            co: data.co,
            pm25: data.pm25,
            pm10: data.pm10,
            indiceQualite: data.indiceQualite,
            dateHeure: new Date(data.dateHeure),
          },
        });

        communesTraitees++;
      } catch (error) {
        communesErreur++;
        this.logger.error(
          `Erreur collecte air commune ${commune.id} (${commune.nom})`,
          error,
        );
      }
    }

    await this.prisma.logCollecte.create({
      data: {
        type: 'AIR',
        statut: communesTraitees === 0 && communes.length > 0 ? 'ERROR' : 'SUCCESS',
        communesTraitees,
        communesErreur,
        dureeMs: Date.now() - start,
      },
    });

    this.logger.log(
      `Collecte air terminée: ${communesTraitees} OK, ${communesErreur} erreurs`,
    );
  }

  @Cron(CronExpression.EVERY_HOUR)
  async collecteMeteo() {
    this.logger.log('Démarrage collecte météo');
    const start = Date.now();
    let communesTraitees = 0;
    let communesErreur = 0;

    const communes = await this.prisma.commune.findMany({
      where: { active: true },
    });

    for (const commune of communes) {
      try {
        const data = await this.meteoApi.fetchCurrent(
          Number(commune.latitude),
          Number(commune.longitude),
        );

        await this.prisma.donneeMeteo.create({
          data: {
            communeId: commune.id,
            temperature: data.temperature,
            pression: data.pression,
            humidite: data.humidite,
            meteoCiel: data.meteoCiel,
            vitesseVent: data.vitesseVent,
            dateHeure: new Date(data.dateHeure),
          },
        });

        communesTraitees++;
      } catch (error) {
        communesErreur++;
        this.logger.error(
          `Erreur collecte météo commune ${commune.id} (${commune.nom})`,
          error,
        );
      }
    }

    await this.prisma.logCollecte.create({
      data: {
        type: 'METEO',
        statut: communesTraitees === 0 && communes.length > 0 ? 'ERROR' : 'SUCCESS',
        communesTraitees,
        communesErreur,
        dureeMs: Date.now() - start,
      },
    });

    this.logger.log(
      `Collecte météo terminée: ${communesTraitees} OK, ${communesErreur} erreurs`,
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async miseAJourPopulation() {
    this.logger.log('Démarrage mise à jour population');
    const start = Date.now();
    let communesTraitees = 0;
    let communesErreur = 0;

    const communes = await this.prisma.commune.findMany({
      where: { active: true },
      select: { id: true, codeInsee: true },
    });

    for (const commune of communes) {
      try {
        const { data } = await firstValueFrom(
          this.httpService.get(
            `https://geo.api.gouv.fr/communes/${commune.codeInsee}?fields=population`,
          ),
        );

        if (data.population != null) {
          await this.prisma.commune.update({
            where: { id: commune.id },
            data: { population: data.population },
          });
        }

        communesTraitees++;
      } catch (error) {
        communesErreur++;
        this.logger.error(
          `Erreur MAJ population commune ${commune.codeInsee}`,
          error,
        );
      }
    }

    await this.prisma.logCollecte.create({
      data: {
        type: 'POPULATION',
        statut: communesTraitees === 0 && communes.length > 0 ? 'ERROR' : 'SUCCESS',
        communesTraitees,
        communesErreur,
        dureeMs: Date.now() - start,
      },
    });

    this.logger.log(
      `MAJ population terminée: ${communesTraitees} OK, ${communesErreur} erreurs`,
    );
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async desactivationCommunes() {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await this.prisma.commune.updateMany({
      where: {
        active: true,
        activatedAt: { lt: sevenDaysAgo },
      },
      data: { active: false },
    });

    if (result.count > 0) {
      this.logger.log(`${result.count} communes désactivées (inactives > 7j)`);
    }
  }
}
