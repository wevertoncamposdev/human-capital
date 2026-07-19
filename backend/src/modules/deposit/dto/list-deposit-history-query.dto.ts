import { IsDateString, IsEnum, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { DepositExitType } from '../../../generated/prisma';
import { PaginationQueryDto } from '../../../core/dto/pagination-query.dto';

export class ListDepositHistoryQueryDto extends PaginationQueryDto {
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
  @IsEnum(DepositExitType)
  type?: DepositExitType;

  @IsOptional()
  @IsString()
  destinationName?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

