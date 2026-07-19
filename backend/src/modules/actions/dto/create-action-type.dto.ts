import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ActionTarget } from '../../../generated/prisma';

export class CreateActionTypeDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(ActionTarget)
  target?: ActionTarget;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
