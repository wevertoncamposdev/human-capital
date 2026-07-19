import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PantryExitType } from '../../../generated/prisma';
import { PaginationQueryDto } from '../../../core/dto/pagination-query.dto';

export class ListPantryExitsQueryDto extends PaginationQueryDto {
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
  @IsEnum(PantryExitType)
  type?: PantryExitType;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
