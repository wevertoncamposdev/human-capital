import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class ConfirmTenantRegistrationDto {
  @IsString()
  @IsNotEmpty()
  registrationId!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}

