import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FavoriteService } from './favorite.service';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoriteController {
  constructor(private favoriteService: FavoriteService) {}

  @Get()
  getFavorites(@Request() req: { user: { id: number } }) {
    return this.favoriteService.getFavorites(req.user.id);
  }

  @Post(':communeId')
  addFavorite(
    @Request() req: { user: { id: number } },
    @Param('communeId', ParseIntPipe) communeId: number,
  ) {
    return this.favoriteService.addFavorite(req.user.id, communeId);
  }

  @Delete(':communeId')
  removeFavorite(
    @Request() req: { user: { id: number } },
    @Param('communeId', ParseIntPipe) communeId: number,
  ) {
    return this.favoriteService.removeFavorite(req.user.id, communeId);
  }
}
