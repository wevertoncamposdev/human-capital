import { IsDateString, IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PantryExitType } from '../../../generated/prisma';
import { PaginationQueryDto } from '../../../core/dto/pagination-query.dto';

export class ListPantryHistoryQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['ALL', 'ENTRY', 'EXIT'])
  kind?: 'ALL' | 'ENTRY' | 'EXIT';

  @IsOptional()
  @IsUUID()
  itemId?: string;

  @IsOptional()
  @IsEnum(PantryExitType)
  type?: PantryExitType;

  @IsOptional()
  @IsString()
  eventName?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

