import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Role } from '../common/enums/role.enum';

const COMMENT_SELECT = {
  id: true,
  content: true,
  userId: true,
  topicId: true,
  parentId: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  user: { select: { id: true, username: true } },
};

@Injectable()
export class CommentService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  async findAll(topicId: number, page: number, limit: number, requestingUserId?: number, isAdmin = false) {
    const take = Math.min(limit, 20);
    const skip = (page - 1) * take;

    const topic = await this.prisma.topic.findFirst({ where: { id: topicId, deletedAt: null } });
    if (!topic) throw new NotFoundException('Topic introuvable');

    const visibilityFilter = isAdmin ? {} : { status: 'visible' };

    const [rootComments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: { topicId, parentId: null, deletedAt: null, ...visibilityFilter },
        select: COMMENT_SELECT,
        skip,
        take,
      }),
      this.prisma.comment.count({ where: { topicId, parentId: null, deletedAt: null, ...visibilityFilter } }),
    ]);

    const allComments = await this.prisma.comment.findMany({
      where: { topicId, parentId: { not: null }, deletedAt: null, ...visibilityFilter },
      select: COMMENT_SELECT,
    });

    const allIds = [...rootComments, ...allComments].map((c) => c.id);
    const [voteScores, userVotes] = await Promise.all([
      this.prisma.vote.groupBy({
        by: ['targetId'],
        where: { targetType: 'COMMENT', targetId: { in: allIds } },
        _sum: { value: true },
      }),
      requestingUserId
        ? this.prisma.vote.findMany({
            where: {
              userId: requestingUserId,
              targetType: 'COMMENT',
              targetId: { in: allIds },
            },
          })
        : Promise.resolve([]),
    ]);

    const scoreMap = new Map(voteScores.map((v) => [v.targetId, v._sum.value ?? 0]));
    const userVoteMap = new Map(
      (userVotes as { targetId: number; value: number }[]).map((v) => [v.targetId, v.value]),
    );

    const mapComment = (c: (typeof rootComments)[0]) => ({
      id: c.id,
      content: c.content,
      author: { id: c.user.id, pseudo: c.user.username },
      score: scoreMap.get(c.id) ?? 0,
      userVote: userVoteMap.get(c.id) ?? null,
      isEdited: c.updatedAt.getTime() - c.createdAt.getTime() > 1000,
      parentId: c.parentId,
      status: c.status,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    });

    const commentsByParent = new Map<number, (typeof allComments)[0][]>();
    for (const c of allComments) {
      if (c.parentId !== null) {
        if (!commentsByParent.has(c.parentId)) commentsByParent.set(c.parentId, []);
        commentsByParent.get(c.parentId)!.push(c);
      }
    }

    const buildTree = (comment: (typeof rootComments)[0], depth: number): object => {
      const mapped = mapComment(comment);
      if (depth >= 3) return { ...mapped, children: [] };
      const children = (commentsByParent.get(comment.id) ?? [])
        .sort((a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0))
        .map((child) => buildTree(child, depth + 1));
      return { ...mapped, children };
    };

    const sortedRoot = [...rootComments].sort(
      (a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0),
    );

    const data = sortedRoot.map((c) => buildTree(c, 1));

    return { data, total, page, limit: take };
  }

  async create(topicId: number, userId: number, dto: CreateCommentDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (user.estSuspendu) throw new ForbiddenException('Votre compte est suspendu');

    const topic = await this.prisma.topic.findFirst({ where: { id: topicId, deletedAt: null } });
    if (!topic) throw new NotFoundException('Topic introuvable');

    if (topic.isClosed) {
      throw new ForbiddenException('Ce topic est fermé');
    }

    if (dto.parentId) {
      const parent = await this.prisma.comment.findFirst({
        where: { id: dto.parentId, topicId, deletedAt: null },
      });
      if (!parent) throw new NotFoundException('Commentaire parent introuvable');

      const depth = await this.computeDepth(dto.parentId);
      if (depth >= 3) {
        throw new UnprocessableEntityException('Profondeur maximale de commentaires atteinte');
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        content: dto.content.trim(),
        userId,
        topicId,
        parentId: dto.parentId ?? null,
      },
      select: COMMENT_SELECT,
    });

    return {
      ...comment,
      author: { id: comment.user.id, pseudo: comment.user.username },
    };
  }

  async update(topicId: number, commentId: number, userId: number, userRole: Role, dto: UpdateCommentDto) {
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, topicId, deletedAt: null },
    });
    if (!comment) throw new NotFoundException('Commentaire introuvable');

    if (comment.userId !== userId && userRole !== Role.ADMIN) {
      throw new ForbiddenException('Accès refusé');
    }

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { content: dto.content.trim() },
      select: COMMENT_SELECT,
    });

    return {
      ...updated,
      author: { id: updated.user.id, pseudo: updated.user.username },
    };
  }

  async hideComment(topicId: number, commentId: number, reason?: string) {
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, topicId, deletedAt: null },
    });
    if (!comment) throw new NotFoundException('Commentaire introuvable');

    await this.prisma.comment.update({ where: { id: commentId }, data: { status: 'hidden' } });

    const message = reason
      ? `Votre contenu a été masqué par un admin. Raison : ${reason}`
      : 'Votre contenu a été masqué par un admin';
    await this.notificationService.create(comment.userId, message, reason);

    return { success: true };
  }

  async showComment(topicId: number, commentId: number) {
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, topicId, deletedAt: null },
    });
    if (!comment) throw new NotFoundException('Commentaire introuvable');

    await this.prisma.comment.update({ where: { id: commentId }, data: { status: 'visible' } });
    return { success: true };
  }

  async deleteComment(topicId: number, commentId: number, reason?: string) {
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, topicId, deletedAt: null },
    });
    if (!comment) throw new NotFoundException('Commentaire introuvable');

    const message = reason
      ? `Votre contenu a été supprimé par un admin. Raison : ${reason}`
      : 'Votre contenu a été supprimé par un admin';

    await this.prisma.comment.delete({ where: { id: commentId } });
    await this.notificationService.create(comment.userId, message, reason);

    return { success: true };
  }

  async selfDeleteComment(topicId: number, commentId: number, userId: number) {
    const comment = await this.prisma.comment.findFirst({
      where: { id: commentId, topicId, deletedAt: null },
    });
    if (!comment) throw new NotFoundException('Commentaire introuvable');

    if (comment.userId !== userId) {
      throw new ForbiddenException('Accès refusé');
    }

    await this.prisma.comment.update({ where: { id: commentId }, data: { status: 'hidden' } });
    return { success: true };
  }

  private async computeDepth(commentId: number): Promise<number> {
    let depth = 1;
    let currentId: number | null = commentId;

    while (currentId !== null && depth <= 3) {
      const c = await this.prisma.comment.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });
      if (!c) break;
      currentId = c.parentId;
      if (currentId !== null) depth++;
    }

    return depth;
  }
}
