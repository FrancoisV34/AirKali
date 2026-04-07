import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';

interface JwtUser {
  id: number;
  email: string;
  role: string;
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get()
  getUnread(@Request() req: { user: JwtUser }) {
    return this.notificationService.getUnread(req.user.id);
  }

  @Patch(':id/read')
  markAsRead(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: JwtUser },
  ) {
    return this.notificationService.markAsRead(id, req.user.id);
  }
}
