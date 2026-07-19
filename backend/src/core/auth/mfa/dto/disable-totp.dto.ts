import { IsString, Matches } from 'class-validator';

export class DisableTotpDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Código inválido' })
  code: string;
}

