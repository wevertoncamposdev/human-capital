import { IsString } from 'class-validator';

export class CreateDepositSectorDto {
  @IsString()
  name: string;
}

