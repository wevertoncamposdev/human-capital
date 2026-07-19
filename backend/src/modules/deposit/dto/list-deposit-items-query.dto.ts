import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../core/dto/pagination-query.dto';

export class ListDepositItemsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  q?: string;
}
