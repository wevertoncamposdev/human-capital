import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ReversePantryMovementDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

