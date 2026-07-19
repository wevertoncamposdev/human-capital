import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class VerifyMfaDto {
  @IsString()
  challengeId: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsBoolean()
  rememberDevice?: boolean;
}

