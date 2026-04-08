import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SuspendUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Le motif est obligatoire' })
  @MaxLength(1000)
  motif!: string;
}
