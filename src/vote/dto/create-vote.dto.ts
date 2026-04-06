import { IsIn, IsInt, IsString, Min } from 'class-validator';

export class CreateVoteDto {
  @IsString()
  @IsIn(['TOPIC', 'COMMENT'])
  targetType: 'TOPIC' | 'COMMENT';

  @IsInt()
  @Min(1)
  targetId: number;

  @IsInt()
  @IsIn([1, -1])
  value: 1 | -1;
}
