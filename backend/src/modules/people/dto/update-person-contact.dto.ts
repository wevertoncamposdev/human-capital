import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

const CONTACT_TYPES = ['EMAIL', 'PHONE'] as const;
const CONTACT_ROLES = ['SELF', 'RESPONSIBLE', 'EMERGENCY'] as const;

export class UpdatePersonContactDto {
  @IsOptional()
  @IsIn(CONTACT_TYPES)
  type?: (typeof CONTACT_TYPES)[number];

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsIn(CONTACT_ROLES)
  role?: (typeof CONTACT_ROLES)[number];

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  relationship?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  isWhatsapp?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

