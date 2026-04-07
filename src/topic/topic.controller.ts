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
import { TopicService } from './topic.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { Role } from '../common/enums/role.enum';

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

@Controller('topics')
export class TopicController {
  constructor(private topicService: TopicService) {}

  @Get()
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('sort') sort = 'recent',
    @Query('categoryId') categoryId?: string,
    @Request() req?: { user?: JwtUser },
  ) {
    const parsedCategoryId = categoryId ? parseInt(categoryId, 10) : undefined;
    const isAdmin = req?.user?.role === Role.ADMIN;
    return this.topicService.findAll(
      parseInt(page, 10),
      parseInt(limit, 10),
      sort,
      parsedCategoryId,
      req?.user?.id,
      isAdmin,
    );
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req?: { user?: JwtUser },
  ) {
    const isAdmin = req?.user?.role === Role.ADMIN;
    return this.topicService.findOne(id, req?.user?.id, isAdmin);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Request() req: { user: JwtUser },
    @Body(ValidationPipe) dto: CreateTopicDto,
  ) {
    return this.topicService.create(req.user.id, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: JwtUser },
    @Body(ValidationPipe) dto: UpdateTopicDto,
  ) {
    return this.topicService.update(id, req.user.id, req.user.role, dto);
  }

  @Patch(':id/hide')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  hide(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) body: ModerateBodyDto,
  ) {
    return this.topicService.hideTopic(id, body.reason);
  }

  @Patch(':id/show')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  show(@Param('id', ParseIntPipe) id: number) {
    return this.topicService.showTopic(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  deleteTopic(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) body: ModerateBodyDto,
  ) {
    return this.topicService.deleteTopic(id, body.reason);
  }

  @Patch(':id/close')
  @UseGuards(JwtAuthGuard)
  close(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: JwtUser },
  ) {
    return this.topicService.closeTopic(id, req.user.id, req.user.role);
  }

  @Patch(':id/reopen')
  @UseGuards(JwtAuthGuard)
  reopen(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: JwtUser },
  ) {
    return this.topicService.reopenTopic(id, req.user.id, req.user.role);
  }
}
