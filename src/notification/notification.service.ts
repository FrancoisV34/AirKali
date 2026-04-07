import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, message: string, reason?: string) {
    return this.prisma.notification.create({
      data: { userId, message, reason: reason ?? null },
    });
  }

  async getUnread(userId: number) {
    return this.prisma.notification.findMany({
      where: { userId, readAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async markAsRead(id: number, userId: number) {
    const notif = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notif) return null;
    return this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanOld() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    await this.prisma.notification.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
  }
}
