import {
  IsString,
  IsInt,
  IsOptional,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  content: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  parentId?: number | null;
}
