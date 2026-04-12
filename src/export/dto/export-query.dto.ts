import { IsDateString, IsEnum, IsNotEmpty } from 'class-validator';

export enum ExportFormat {
  CSV = 'csv',
  PDF = 'pdf',
}

export enum ExportType {
  AIR = 'air',
  METEO = 'meteo',
  BOTH = 'both',
}

export class ExportQueryDto {
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @IsEnum(ExportType)
  type: ExportType;

  @IsDateString()
  @IsNotEmpty()
  from: string;

  @IsDateString()
  @IsNotEmpty()
  to: string;
}
