import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateProgramAttachmentDto {
  @IsString()
  label!: string;

  @IsString()
  filePath!: string;

  @IsOptional()
  @IsString()
  mimeType?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  fileSizeBytes?: number | null;
}
