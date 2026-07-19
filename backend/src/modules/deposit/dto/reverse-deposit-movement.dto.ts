import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ReverseDepositMovementDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

