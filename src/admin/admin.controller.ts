import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { AdminService } from './admin.service';
import { SuspendUserDto } from './dto/suspend-user.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('users')
  getUsers(
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
  ) {
    return this.adminService.getUsers(search, page, limit);
  }

  @Post('users/:id/suspend')
  suspendUser(
    @Param('id', ParseIntPipe) userId: number,
    @Body() dto: SuspendUserDto,
    @Request() req: { user: { id: number } },
  ) {
    return this.adminService.suspendUser(req.user.id, userId, dto.motif);
  }

  @Post('users/:id/reactivate')
  reactivateUser(
    @Param('id', ParseIntPipe) userId: number,
    @Request() req: { user: { id: number } },
  ) {
    return this.adminService.reactivateUser(req.user.id, userId);
  }

  @Get('users/:id/suspension-history')
  getSuspensionHistory(@Param('id', ParseIntPipe) userId: number) {
    return this.adminService.getSuspensionHistory(userId);
  }
}
