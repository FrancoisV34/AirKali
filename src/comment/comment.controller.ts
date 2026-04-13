import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Role } from '../common/enums/role.enum';
import { ApiTags } from '@nestjs/swagger';

class ModerateBodyDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

interface JwtUser {
  id: number;
  email: string;
  role: Role;
}

@ApiTags('Forum — Commentaires')
@Controller('topics/:topicId/comments')
export class CommentController {
  constructor(private commentService: CommentService) {}

  @Get()
  findAll(
    @Param('topicId', ParseIntPipe) topicId: number,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Request() req?: { user?: JwtUser },
  ) {
    const isAdmin = req?.user?.role === Role.ADMIN;
    return this.commentService.findAll(
      topicId,
      parseInt(page, 10),
      parseInt(limit, 10),
      req?.user?.id,
      isAdmin,
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Param('topicId', ParseIntPipe) topicId: number,
    @Request() req: { user: JwtUser },
    @Body(ValidationPipe) dto: CreateCommentDto,
  ) {
    return this.commentService.create(topicId, req.user.id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('topicId', ParseIntPipe) topicId: number,
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: JwtUser },
    @Body(ValidationPipe) dto: UpdateCommentDto,
  ) {
    return this.commentService.update(topicId, id, req.user.id, req.user.role, dto);
  }

  @Patch(':id/hide')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  hide(
    @Param('topicId', ParseIntPipe) topicId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) body: ModerateBodyDto,
  ) {
    return this.commentService.hideComment(topicId, id, body.reason);
  }

  @Patch(':id/show')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  show(
    @Param('topicId', ParseIntPipe) topicId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.commentService.showComment(topicId, id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  deleteComment(
    @Param('topicId', ParseIntPipe) topicId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) body: ModerateBodyDto,
  ) {
    return this.commentService.deleteComment(topicId, id, body.reason);
  }

  @Delete(':id/self')
  @UseGuards(JwtAuthGuard)
  selfDelete(
    @Param('topicId', ParseIntPipe) topicId: number,
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: JwtUser },
  ) {
    return this.commentService.selfDeleteComment(topicId, id, req.user.id);
  }
}
