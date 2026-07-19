import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreatePersonAttachmentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(191)
  @Transform(trimString)
  label: string;

  @IsString()
  @MinLength(1)
  @MaxLength(191)
  @Transform(trimString)
  filePath: string;

  @IsOptional()
  @IsString()
  @MaxLength(191)
  @Transform(trimString)
  mimeType?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10 * 1024 * 1024)
  fileSizeBytes?: number | null;
}
