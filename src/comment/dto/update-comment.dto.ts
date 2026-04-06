import { IsString, MinLength, MaxLength } from 'class-validator';

export class UpdateCommentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  content: string;
}
