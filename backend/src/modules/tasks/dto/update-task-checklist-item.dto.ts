import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class UpdateTaskChecklistItemDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Transform(trimString)
  label?: string;

  @IsOptional()
  @IsBoolean()
  done?: boolean;

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
  dueDate?: string | null;

  @IsOptional()
  @IsString()
  @Transform(trimString)
  notes?: string | null;
}
