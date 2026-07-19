import { IsOptional, IsString } from 'class-validator';

export class CreateProjectGroupDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;
}

