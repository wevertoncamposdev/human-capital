import { IsOptional, IsString } from 'class-validator';

export class UpdateProjectGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;
}

