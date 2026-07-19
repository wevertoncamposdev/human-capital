import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateHouseholdTransferDto {
  @IsString()
  fromHouseholdId: string;

  @IsString()
  toHouseholdId: string;

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
  notes?: string;
}
