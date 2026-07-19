import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PantryDonorType } from '../../../generated/prisma';

export class CreatePantryDonorDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(PantryDonorType)
  type?: PantryDonorType;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : []))
  tags?: string[];

  @IsOptional()
  @IsString()
  internalNotes?: string;
}
