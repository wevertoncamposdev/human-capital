import { Transform, Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { DepositExitType } from '../../../generated/prisma';

export class UpdateDepositExitDto {
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @IsOptional()
  @IsUUID()
  entryId?: string;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsDateString()
  exitDate?: string;

  @IsOptional()
  @IsEnum(DepositExitType)
  type?: DepositExitType;

  @IsOptional()
  @IsString()
  destinationName?: string;

  @IsOptional()
  @IsString()
  destinationType?: string;

  @IsOptional()
  @IsDateString()
  expectedReturnAt?: string;

  @IsOptional()
  @IsDateString()
  returnedAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  returnedQuantity?: number;

  @IsOptional()
  @IsString()
  returnNotes?: string;

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
