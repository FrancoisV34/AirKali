import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Inscription d\'un nouvel utilisateur' })
  @ApiResponse({ status: 201, description: 'Utilisateur créé, JWT retourné' })
  @ApiResponse({ status: 400, description: 'Données invalides ou mot de passe trop faible' })
  @ApiResponse({ status: 409, description: 'Email ou username déjà utilisé' })
  @ApiResponse({ status: 429, description: 'Trop de tentatives (rate limiting)' })
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Connexion d\'un utilisateur' })
  @ApiResponse({ status: 200, description: 'JWT retourné' })
  @ApiResponse({ status: 401, description: 'Email ou mot de passe incorrect' })
  @ApiResponse({ status: 403, description: 'Compte suspendu' })
  @ApiResponse({ status: 429, description: 'Trop de tentatives (rate limiting)' })
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
