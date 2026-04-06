import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVoteDto } from './dto/create-vote.dto';

@Injectable()
export class VoteService {
  constructor(private prisma: PrismaService) {}

  async vote(userId: number, dto: CreateVoteDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (user.estSuspendu) throw new ForbiddenException('Votre compte est suspendu');

    const authorId = await this.getTargetAuthorId(dto.targetType, dto.targetId);
    if (authorId === null) throw new NotFoundException('Cible introuvable');
    if (authorId === userId) throw new ForbiddenException('Vous ne pouvez pas voter pour votre propre contenu');

    const existing = await this.prisma.vote.findUnique({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: dto.targetType,
          targetId: dto.targetId,
        },
      },
    });

    let vote: { id: number; value: number } | null = null;

    if (!existing) {
      vote = await this.prisma.vote.create({
        data: { userId, targetType: dto.targetType, targetId: dto.targetId, value: dto.value },
      });
    } else if (existing.value === dto.value) {
      await this.prisma.vote.delete({ where: { id: existing.id } });
      vote = null;
    } else {
      vote = await this.prisma.vote.update({
        where: { id: existing.id },
        data: { value: dto.value },
      });
    }

    const newScore = await this.computeScore(dto.targetType, dto.targetId);

    return {
      vote: vote ? { id: vote.id, value: vote.value } : null,
      newScore,
    };
  }

  private async getTargetAuthorId(
    targetType: string,
    targetId: number,
  ): Promise<number | null> {
    if (targetType === 'TOPIC') {
      const topic = await this.prisma.topic.findFirst({
        where: { id: targetId, deletedAt: null },
        select: { userId: true },
      });
      return topic?.userId ?? null;
    } else {
      const comment = await this.prisma.comment.findFirst({
        where: { id: targetId, deletedAt: null },
        select: { userId: true },
      });
      return comment?.userId ?? null;
    }
  }

  private async computeScore(targetType: string, targetId: number): Promise<number> {
    const result = await this.prisma.vote.aggregate({
      where: { targetType, targetId },
      _sum: { value: true },
    });
    return result._sum.value ?? 0;
  }
}
