import { IsNumber, IsOptional, IsString, Length, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class UpsertHouseholdProfileDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsString()
  ownership?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  areaM2?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  rooms?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bathrooms?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{5}-?\d{3}$/)
  cep?: string;

  @IsOptional()
  @IsString()
  number?: string;

  @IsOptional()
  @IsString()
  complement?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  // Os campos abaixo são preenchidos a partir do CEP (ViaCEP) no backend.
  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  state?: string;
}
