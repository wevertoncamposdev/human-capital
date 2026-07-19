import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const trimTag = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class SetPersonRecordTagsDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((entry) => trimTag({ value: entry })) : value,
  )
  tags?: string[];
}
