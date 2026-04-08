import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { MailService } from '../mail/mail.service';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
    private mailService: MailService,
  ) {}

  async getUsers(search?: string, page: number = 1, limit: number = 20) {
    const take = Math.min(limit, 50);
    const skip = (page - 1) * take;

    const where = search
      ? {
          OR: [
            { nom: { contains: search } },
            { prenom: { contains: search } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          prenom: true,
          nom: true,
          email: true,
          role: true,
          estSuspendu: true,
          createdAt: true,
        },
        skip,
        take,
        orderBy: { nom: 'asc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, limit: take };
  }

  async suspendUser(adminId: number, userId: number, motif: string) {
    const [admin, target] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: adminId }, select: { id: true, role: true } }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, prenom: true, nom: true, role: true, estSuspendu: true },
      }),
    ]);

    if (!admin) throw new NotFoundException('Admin introuvable');
    if (!target) throw new NotFoundException('Utilisateur introuvable');

    if (adminId === userId) {
      throw new ForbiddenException('Un administrateur ne peut pas se suspendre lui-même');
    }

    if (target.role === Role.ADMIN) {
      throw new ForbiddenException('Impossible de suspendre un administrateur');
    }

    if (target.estSuspendu) {
      throw new BadRequestException('Cet utilisateur est déjà suspendu');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { estSuspendu: true },
    });

    await this.prisma.suspensionLog.create({
      data: { userId, adminId, action: 'SUSPEND', motif },
    });

    await this.notificationService.create(
      userId,
      'Votre compte a été suspendu par un administrateur.',
      motif,
    );

    await this.mailService.sendSuspensionEmail(target.email, target.prenom, motif);

    return { message: 'Utilisateur suspendu.' };
  }

  async reactivateUser(adminId: number, userId: number) {
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, prenom: true, nom: true, estSuspendu: true },
    });

    if (!target) throw new NotFoundException('Utilisateur introuvable');

    if (!target.estSuspendu) {
      throw new BadRequestException('Cet utilisateur n\'est pas suspendu');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { estSuspendu: false },
    });

    await this.prisma.suspensionLog.create({
      data: { userId, adminId, action: 'REACTIVATE', motif: null },
    });

    await this.notificationService.create(
      userId,
      'Votre compte a été réactivé par un administrateur.',
    );

    await this.mailService.sendReactivationEmail(target.email, target.prenom);

    return { message: 'Utilisateur réactivé.' };
  }

  async getSuspensionHistory(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

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
}
