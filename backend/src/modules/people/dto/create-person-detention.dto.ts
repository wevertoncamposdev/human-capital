import { IsOptional, IsString } from 'class-validator';

export class CreatePersonDetentionDto {
  @IsString()
  status: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

