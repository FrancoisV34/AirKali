import { IsInt, IsOptional, IsPositive, IsString, Matches, ValidateIf } from 'class-validator';

export class UpdateCommuneDto {
  @ValidateIf((o: UpdateCommuneDto) => o.communeId !== null)
  @IsOptional()
  @IsInt()
  @IsPositive()
  communeId?: number | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{5}$/, { message: 'Code postal invalide' })
  codePostal?: string;
}
