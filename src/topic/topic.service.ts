import {
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { Role } from '../common/enums/role.enum';

const TOPIC_SELECT = {
  id: true,
  title: true,
  content: true,
  categoryId: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  category: { select: { id: true, name: true } },
  user: { select: { id: true, username: true } },
};

@Injectable()
export class TopicService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    page: number,
    limit: number,
    sort: string,
    categoryId?: number,
    requestingUserId?: number,
  ) {
    const take = Math.min(limit, 20);
    const skip = (page - 1) * take;
    const where = { deletedAt: null, ...(categoryId ? { categoryId } : {}) };

    let orderBy: object;
    if (sort === 'popular') {
      orderBy = { id: 'asc' };
    } else if (sort === 'active') {
      orderBy = { updatedAt: 'desc' };
    } else {
      orderBy = { createdAt: 'desc' };
    }

    const [topics, total] = await Promise.all([
      this.prisma.topic.findMany({ where, orderBy, take, skip, select: TOPIC_SELECT }),
      this.prisma.topic.count({ where }),
    ]);

    let processed = topics;

    if (sort === 'popular') {
      const topicIds = topics.map((t) => t.id);
      const votes = await this.prisma.vote.groupBy({
        by: ['targetId'],
        where: { targetType: 'TOPIC', targetId: { in: topicIds } },
        _sum: { value: true },
      });
      const scoreMap = new Map(votes.map((v) => [v.targetId, v._sum.value ?? 0]));
      processed = [...topics].sort(
        (a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0),
      );
    }

    const topicIds2 = processed.map((t) => t.id);
    const [commentCounts, voteScores] = await Promise.all([
      this.prisma.comment.groupBy({
        by: ['topicId'],
        where: { topicId: { in: topicIds2 }, deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.vote.groupBy({
        by: ['targetId'],
        where: { targetType: 'TOPIC', targetId: { in: topicIds2 } },
        _sum: { value: true },
      }),
    ]);

    const commentMap = new Map(commentCounts.map((c) => [c.topicId, c._count.id]));
    const scoreMap2 = new Map(voteScores.map((v) => [v.targetId, v._sum.value ?? 0]));

    const data = processed.map((t) => ({
      id: t.id,
      title: t.title,
      excerpt: t.content.slice(0, 100),
      category: t.category,
      author: { id: t.user.id, pseudo: t.user.username },
      score: scoreMap2.get(t.id) ?? 0,
      commentCount: commentMap.get(t.id) ?? 0,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));

    return { data, total, page, limit: take };
  }

  async findOne(id: number, requestingUserId?: number) {
    const topic = await this.prisma.topic.findFirst({
      where: { id, deletedAt: null },
      select: TOPIC_SELECT,
    });
    if (!topic) throw new NotFoundException('Topic introuvable');

    const [scoreResult, userVoteResult] = await Promise.all([
      this.prisma.vote.aggregate({
        where: { targetType: 'TOPIC', targetId: id },
        _sum: { value: true },
      }),
      requestingUserId
        ? this.prisma.vote.findUnique({
            where: {
              userId_targetType_targetId: {
                userId: requestingUserId,
                targetType: 'TOPIC',
                targetId: id,
              },
            },
          })
        : Promise.resolve(null),
    ]);

    return {
      id: topic.id,
      title: topic.title,
      content: topic.content,
      category: topic.category,
      author: { id: topic.user.id, pseudo: topic.user.username },
      score: scoreResult._sum.value ?? 0,
      userVote: userVoteResult?.value ?? null,
      isEdited: topic.updatedAt.getTime() - topic.createdAt.getTime() > 1000,
      createdAt: topic.createdAt,
      updatedAt: topic.updatedAt,
    };
  }

  async create(userId: number, dto: CreateTopicDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (user.estSuspendu) {
      throw new ForbiddenException('Votre compte est suspendu');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const topicCount = await this.prisma.topic.count({
      where: { userId, createdAt: { gte: today }, deletedAt: null },
    });
    if (topicCount >= 3) {
      throw new HttpException('Limite de 3 topics par jour atteinte', 429);
    }

    if (dto.categoryId) {
      const cat = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
      if (!cat) throw new NotFoundException('Catégorie introuvable');
    }

    const topic = await this.prisma.topic.create({
      data: {
        title: dto.title.trim(),
        content: dto.content.trim(),
        userId,
        categoryId: dto.categoryId ?? null,
      },
      select: TOPIC_SELECT,
    });

    return {
      ...topic,
      author: { id: topic.user.id, pseudo: topic.user.username },
    };
  }

  async update(
    id: number,
    userId: number,
    userRole: Role,
    dto: UpdateTopicDto,
  ) {
    const topic = await this.prisma.topic.findFirst({
      where: { id, deletedAt: null },
    });
    if (!topic) throw new NotFoundException('Topic introuvable');

    if (topic.userId !== userId && userRole !== Role.ADMIN) {
      throw new ForbiddenException('Accès refusé');
    }

    if (dto.categoryId) {
      const cat = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
      if (!cat) throw new NotFoundException('Catégorie introuvable');
    }

    const updated = await this.prisma.topic.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.content !== undefined ? { content: dto.content.trim() } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
      },
      select: TOPIC_SELECT,
    });

    return {
      ...updated,
      author: { id: updated.user.id, pseudo: updated.user.username },
    };
  }
}
