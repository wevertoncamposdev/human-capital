import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePersonIncomeDto {
  @IsString()
  type: string;

  @Type(() => Number)
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  frequency?: string;

  @IsOptional()
  @IsString()
  contractType?: string;

  @IsOptional()
  @IsString()
  householdId?: string;

  @IsOptional()
  @IsBoolean()
  isHouseholdContribution?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
