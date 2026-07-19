import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePersonRelationDto {
  @IsUUID()
  relatedPersonId: string;

  @IsString()
  type: string;

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
