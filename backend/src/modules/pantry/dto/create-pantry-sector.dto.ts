import { IsString } from 'class-validator';

export class CreatePantrySectorDto {
  @IsString()
  name: string;
}

