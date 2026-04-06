import {
  Body,
  Controller,
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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Role } from '../common/enums/role.enum';

interface JwtUser {
  id: number;
  email: string;
  role: Role;
}

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
    return this.commentService.findAll(
      topicId,
      parseInt(page, 10),
      parseInt(limit, 10),
      req?.user?.id,
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
}
