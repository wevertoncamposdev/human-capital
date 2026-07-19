import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

const TASK_STATUS_VALUES = [
  'Backlog',
  'Em andamento',
  'Em revisao',
  'Concluida',
  'Bloqueada',
] as const;

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateTaskSubtaskDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Transform(trimString)
  title?: string;

  @IsOptional()
  @IsIn(TASK_STATUS_VALUES)
  status?: (typeof TASK_STATUS_VALUES)[number];

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
  startDate?: string | null;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  dueDate?: string | null;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  description?: string | null;
}
