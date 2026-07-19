import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class ListProjectEnrollmentsQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsUUID('4')
  groupId?: string;

  @IsOptional()
  @IsUUID('4')
  groupHistoryId?: string;

  @IsOptional()
  @IsUUID('4')
  peopleGroupId?: string;

  @IsOptional()
  @IsUUID('4')
  excludeGroupId?: string;

  @IsOptional()
  @IsUUID('4')
  excludePeopleGroupId?: string;

  @IsOptional()
  @IsString()
  filters?: string;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
