import {
  IsArray,
  IsEmail,
  IsIn,
  IsDateString,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import {
  SEX_OPTIONS,
  GENDER_OPTIONS,
  RACE_COLOR_OPTIONS,
  STATUS_OPTIONS,
  PERSON_TYPE_OPTIONS,
} from '../people.constants';

export class UpdatePersonDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsString()
  socialName?: string | null;

  @IsOptional()
  @IsDateString()
  birthDate?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(SEX_OPTIONS)
  sex?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(GENDER_OPTIONS)
  gender?: string | null;

  @IsOptional()
  @IsString()
  maritalStatus?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(RACE_COLOR_OPTIONS)
  raceColor?: string | null;

  @IsOptional()
  @IsString()
  nationality?: string | null;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(STATUS_OPTIONS)
  status?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(PERSON_TYPE_OPTIONS)
  personType?: string | null;

  @IsOptional()
  @IsString()
  departureReason?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[] | null;

  @IsOptional()
  @IsString()
  profileSummary?: string | null;

  @IsOptional()
  @IsString()
  avatarUrl?: string | null;
}
