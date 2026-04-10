import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  constructor(private config: ConfigService) {
    const host = this.config.get<string>('MAIL_HOST');
    const port = this.config.get<number>('MAIL_PORT');
    const user = this.config.get<string>('MAIL_USER');
    const pass = this.config.get<string>('MAIL_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: port ?? 587,
        secure: (port ?? 587) === 465,
        auth: { user, pass },
      });
    } else {
      this.logger.warn('SMTP non configuré — les emails seront loggés uniquement');
    }
  }

  async sendSuspensionEmail(to: string, prenom: string, motif: string): Promise<void> {
    const subject = 'Votre compte Breath for All a été suspendu';
    const text = `Bonjour ${prenom},\n\nVotre compte a été suspendu par un administrateur.\n\nMotif : ${motif}\n\nSi vous pensez qu'il s'agit d'une erreur, contactez-nous.\n\nL'équipe Breath for All`;

    await this._send(to, subject, text);
  }

  async sendAlertEmail(to: string, data: {
    communeName: string;
    type: 'AIR' | 'METEO';
    valeur: number;
    seuil: number;
    unite: string;
    officielle: boolean;
    communeId: number;
  }): Promise<void> {
    const typeLabel = data.type === 'AIR' ? 'qualite de l\'air' : 'meteo';
    const officielleLabel = data.officielle ? 'officielle ' : '';
    const subject = `[Breath for All] Alerte ${data.type === 'AIR' ? 'air' : 'meteo'} — ${data.communeName}`;
    const text = [
      `Alerte ${officielleLabel}${typeLabel}`,
      '',
      `Commune : ${data.communeName}`,
      `Valeur mesuree : ${data.valeur} ${data.unite}`,
      `Seuil declenche : ${data.seuil} ${data.unite}`,
      '',
      `Consultez les donnees detaillees sur votre espace.`,
      '',
      '---',
      'Pour gerer vos alertes, rendez-vous sur votre espace personnel',
      'dans la section "Mes alertes".',
    ].join('\n');

    await this._send(to, subject, text);
  }

  async sendReactivationEmail(to: string, prenom: string): Promise<void> {
    const subject = 'Votre compte Breath for All a été réactivé';
    const text = `Bonjour ${prenom},\n\nVotre compte a été réactivé. Vous pouvez à nouveau vous connecter.\n\nL'équipe Breath for All`;

    await this._send(to, subject, text);
  }

  private async _send(to: string, subject: string, text: string): Promise<void> {
    const from = this.config.get<string>('MAIL_FROM') ?? 'no-reply@breathforall.fr';

    if (!this.transporter) {
      this.logger.log(`[EMAIL DÉGRADÉ] To: ${to} | Subject: ${subject}`);
      return;
    }

    try {
      await this.transporter.sendMail({ from, to, subject, text });
    } catch (err) {
      this.logger.error(`Échec envoi email à ${to}: ${String(err)}`);
    }
  }
}
