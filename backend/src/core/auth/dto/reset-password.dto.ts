import { Transform } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @MinLength(16)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  token: string;

  @IsString()
  @MinLength(8)
  password: string;
}
