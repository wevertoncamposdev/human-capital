import { Transform, Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { PantryExitType } from '../../../generated/prisma';

export class CreatePantryExitDto {
  @IsUUID()
  itemId: string;

  @IsOptional()
  @IsUUID()
  entryId?: string;

  @IsString()
  @IsNotEmpty()
  sector: string;

  @Type(() => Number)
  @IsNumber()
  quantity: number;

  @IsString()
  unit: string;

  @IsOptional()
  @IsDateString()
  exitDate?: string;

  @IsOptional()
  @IsEnum(PantryExitType)
  type?: PantryExitType;

  @IsOptional()
  @IsString()
  eventName?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : []))
  tags?: string[];

  @IsOptional()
  @IsString()
  internalNotes?: string;
}
