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
import { TopicService } from './topic.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { Role } from '../common/enums/role.enum';

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
    return this.topicService.findAll(
      parseInt(page, 10),
      parseInt(limit, 10),
      sort,
      parsedCategoryId,
      req?.user?.id,
    );
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req?: { user?: JwtUser },
  ) {
    return this.topicService.findOne(id, req?.user?.id);
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
}
