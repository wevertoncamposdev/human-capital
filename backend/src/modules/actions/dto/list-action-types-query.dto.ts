import { IsBooleanString, IsOptional, IsString, MaxLength } from 'class-validator';

export class ListActionTypesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsBooleanString()
  isActive?: string;

  get isActiveValue(): boolean | undefined {
    if (this.isActive === undefined) return undefined;
    return this.isActive === 'true';
  }
}

