import { IsEnum, IsInt } from 'class-validator';
import { AlertType, AlertPalier } from '@prisma/client';

export class CreateAlertDto {
  @IsInt()
  communeId: number;

  @IsEnum(AlertType)
  type: AlertType;

  @IsEnum(AlertPalier)
  palier: AlertPalier;
}
