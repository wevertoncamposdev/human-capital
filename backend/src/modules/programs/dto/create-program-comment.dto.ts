import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateProgramCommentDto {
  @IsString()
  body!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentionUserIds?: string[];
}
