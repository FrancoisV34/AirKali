import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { AlertPalier } from '@prisma/client';

export class CreateManualAlertDto {
  @IsInt()
  communeId: number;

  @IsEnum(AlertPalier)
  palier: AlertPalier;

  @IsOptional()
  @IsString()
  message?: string;
}
