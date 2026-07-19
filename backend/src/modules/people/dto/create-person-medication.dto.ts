import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreatePersonMedicationDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsString()
  medication: string;

  @IsOptional()
  @IsString()
  dosage?: string;

  @IsOptional()
  @IsString()
  schedule?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  prescribingDoctor?: string;

  @IsOptional()
  @IsString()
  permissionDocumentUrl?: string;

  @IsOptional()
  @IsString()
  documentUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
