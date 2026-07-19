import { IsOptional, IsString } from 'class-validator';

export class UpsertPersonSensitiveDocumentsDto {
  @IsOptional()
  @IsString()
  cpf?: string;

  @IsOptional()
  @IsString()
  rg?: string;

  @IsOptional()
  @IsString()
  nis?: string;

  @IsOptional()
  @IsString()
  cns?: string;
}

