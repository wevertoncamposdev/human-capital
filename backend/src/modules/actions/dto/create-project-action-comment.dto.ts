import { IsArray, IsOptional, IsString } from 'class-validator';

export class CreateProjectActionCommentDto {
  @IsString()
  body!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mentionUserIds?: string[];
}
