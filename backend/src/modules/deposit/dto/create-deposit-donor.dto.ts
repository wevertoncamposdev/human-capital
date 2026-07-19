import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DepositDonorType } from '../../../generated/prisma';

export class CreateDepositDonorDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(DepositDonorType)
  type?: DepositDonorType;

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
