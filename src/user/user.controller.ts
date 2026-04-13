import { Body, Controller, Get, Patch, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateCommuneDto } from './dto/update-commune.dto';

@ApiTags('Utilisateur')
@ApiBearerAuth()
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

  @Patch('commune')
  @UseGuards(JwtAuthGuard)
  updateCommune(
    @Request() req: { user: { id: number } },
    @Body() dto: UpdateCommuneDto,
  ) {
    return this.userService.updateCommune(req.user.id, dto);
  }

  @Get('suspension-history')
  @UseGuards(JwtAuthGuard)
  getSuspensionHistory(@Request() req: { user: { id: number } }) {
    return this.userService.getSuspensionHistory(req.user.id);
  }
}
