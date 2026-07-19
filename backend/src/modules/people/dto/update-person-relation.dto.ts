import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdatePersonRelationDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsBoolean()
  livesTogether?: boolean;

  @IsOptional()
  @IsBoolean()
  isLegalGuardian?: boolean;

  @IsOptional()
  @IsBoolean()
  isHouseholdHead?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  householdRole?: string;

  @IsOptional()
  @IsBoolean()
  isIncomeContributor?: boolean;

  @IsOptional()
  @IsBoolean()
  isProvider?: boolean;

  @IsOptional()
  @IsBoolean()
  isDependent?: boolean;
}
