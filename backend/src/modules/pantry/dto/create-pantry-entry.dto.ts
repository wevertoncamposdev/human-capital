import { Transform, Type } from 'class-transformer';
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePantryEntryDto {
  @IsUUID()
  itemId: string;

  @IsOptional()
  @IsUUID()
  donorId?: string;

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
  entryDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

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
