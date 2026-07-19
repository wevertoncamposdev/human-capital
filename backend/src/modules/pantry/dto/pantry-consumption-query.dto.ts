import { IsDateString, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class PantryConsumptionQueryDto {
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
  @IsIn(['ATTENDED', 'DONATION', 'EVENT', 'PARTY', 'CORRECTION'])
  type?: 'ATTENDED' | 'DONATION' | 'EVENT' | 'PARTY' | 'CORRECTION';

  @IsOptional()
  @IsString()
  eventName?: string;
}
