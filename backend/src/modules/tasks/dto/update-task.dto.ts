import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const TASK_STATUS_VALUES = [
  'Backlog',
  'Em andamento',
  'Em revisao',
  'Concluida',
  'Bloqueada',
] as const;

const TASK_PRIORITY_VALUES = ['Baixa', 'Media', 'Alta', 'Critica'] as const;

const TASK_KIND_VALUES = ['Feature', 'Bug', 'Rotina'] as const;

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  @Transform(trimString)
  title?: string;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  summary?: string | null;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  description?: string | null;

  @IsOptional()
  @IsIn(TASK_STATUS_VALUES)
  status?: (typeof TASK_STATUS_VALUES)[number];

  @IsOptional()
  @IsIn(TASK_PRIORITY_VALUES)
  priority?: (typeof TASK_PRIORITY_VALUES)[number];

  @IsOptional()
  @IsIn(TASK_KIND_VALUES)
  kind?: (typeof TASK_KIND_VALUES)[number];

  @IsOptional()
  @IsUUID('4')
  ownerUserId?: string | null;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  owner?: string | null;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  team?: string | null;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  startDate?: string | null;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  dueDate?: string | null;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isMilestone?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  effortPoints?: number | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(32)
  @IsString({ each: true })
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((entry) => String(entry ?? '').trim()).filter(Boolean)
      : value,
  )
  tags?: string[];

  @IsOptional()
  @IsString()
  @Transform(trimString)
  internalNotes?: string | null;
}
