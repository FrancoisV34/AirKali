import {
  Body,
  Controller,
  Post,
  Request,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { VoteService } from './vote.service';
import { CreateVoteDto } from './dto/create-vote.dto';
import { Role } from '../common/enums/role.enum';

interface JwtUser {
  id: number;
  email: string;
  role: Role;
}

@Controller('votes')
@UseGuards(JwtAuthGuard)
export class VoteController {
  constructor(private voteService: VoteService) {}

  @Post()
  vote(
    @Request() req: { user: JwtUser },
    @Body(ValidationPipe) dto: CreateVoteDto,
  ) {
    return this.voteService.vote(req.user.id, dto);
  }
}
