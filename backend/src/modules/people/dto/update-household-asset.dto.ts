import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateHouseholdAssetDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  item?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  quantity?: number;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
