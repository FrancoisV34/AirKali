import {
  IsString,
  IsInt,
  IsOptional,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateTopicDto {
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  content?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  categoryId?: number | null;
}
