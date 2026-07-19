import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../core/dto/pagination-query.dto';

export class ListPantryItemsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  q?: string;
}
