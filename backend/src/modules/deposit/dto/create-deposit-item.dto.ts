import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { Transform } from 'class-transformer';

export class CreateDepositItemDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  group?: string;

  @IsOptional()
  @IsString()
  defaultSector?: string;

  @IsString()
  unit: string;

  @Type(() => Number)
  @IsNumber()
  minStock: number;

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
