import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Request() req: { user: { id: number } }) {
    return this.userService.getProfile(req.user.id);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @Request() req: { user: { id: number } },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(req.user.id, dto);
  }
}
