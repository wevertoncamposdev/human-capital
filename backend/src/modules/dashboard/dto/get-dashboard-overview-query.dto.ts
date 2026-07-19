import { IsOptional, IsString } from 'class-validator';

export class GetDashboardOverviewQueryDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

