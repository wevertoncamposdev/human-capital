import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { AttendanceStatus } from '../../../generated/prisma';

export class UpsertProjectActionAttendanceItemDto {
  @IsUUID('4')
  enrollmentId!: string;

  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  qualityScore?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  qualityNotes?: string | null;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === '1' || value === true)
  @IsBoolean()
  isHighlight?: boolean;
}

export class UpsertProjectActionAttendancesDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => UpsertProjectActionAttendanceItemDto)
  items!: UpsertProjectActionAttendanceItemDto[];
}
