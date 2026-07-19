import { IsString, Matches } from 'class-validator';

export class ConfirmTotpDto {
  @IsString()
  setupId: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'Código inválido' })
  code: string;
}

