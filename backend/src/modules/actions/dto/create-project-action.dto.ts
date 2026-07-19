import { ArrayMaxSize, IsArray, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { ActionStatus } from '../../../generated/prisma';

export class CreateProjectActionDto {
  @IsUUID('4')
  actionTypeId!: string;

  @IsString()
  @MaxLength(160)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  internalNotes?: string | null;

  @IsOptional()
  @IsString()
  planHtml?: string | null;

  @IsOptional()
  @IsString()
  executedHtml?: string | null;

  @IsOptional()
  @IsString()
  conclusionHtml?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  completionPercent?: number | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  photoPaths?: string[];

  @IsOptional()
  @IsEnum(ActionStatus)
  status?: ActionStatus;

  @IsOptional()
  @IsUUID('4')
  projectGroupId?: string | null;

  @IsOptional()
  @IsUUID('4')
  peopleGroupId?: string | null;

  @IsOptional()
  @IsUUID('4')
  targetEnrollmentId?: string | null;

  @IsOptional()
  @IsString()
  plannedStartAt?: string | null;

  @IsOptional()
  @IsString()
  plannedEndAt?: string | null;

  @IsOptional()
  @IsString()
  executedStartAt?: string | null;

  @IsOptional()
  @IsString()
  executedEndAt?: string | null;
}
