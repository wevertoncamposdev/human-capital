import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreatePantryItemAttachmentDto {
  @IsString()
  label: string;

  @IsString()
  filePath: string;

  @IsOptional()
  @IsString()
  mimeType?: string | null;

  @IsOptional()
  @IsInt()
  fileSizeBytes?: number | null;
}
