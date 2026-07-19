import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class DepositConsumptionQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsIn(['item', 'group'])
  view?: 'item' | 'group';

  @IsOptional()
  @IsUUID()
  itemId?: string;

  @IsOptional()
  @IsString()
  group?: string;

  @IsOptional()
  @IsIn(['LOAN', 'FINAL_REMOVAL', 'TRANSFER', 'ADJUSTMENT', 'LOSS'])
  type?: 'LOAN' | 'FINAL_REMOVAL' | 'TRANSFER' | 'ADJUSTMENT' | 'LOSS';

  @IsOptional()
  @IsString()
  destinationName?: string;
}
