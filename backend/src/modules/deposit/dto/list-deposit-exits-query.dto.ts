import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { DepositExitType } from '../../../generated/prisma';
import { PaginationQueryDto } from '../../../core/dto/pagination-query.dto';

export class ListDepositExitsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  itemId?: string;

  @IsOptional()
  @IsEnum(DepositExitType)
  type?: DepositExitType;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
