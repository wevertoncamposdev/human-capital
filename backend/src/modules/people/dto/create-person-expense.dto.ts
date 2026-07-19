import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePersonExpenseDto {
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
  householdId?: string;

  @IsOptional()
  @IsBoolean()
  isHouseholdExpense?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
