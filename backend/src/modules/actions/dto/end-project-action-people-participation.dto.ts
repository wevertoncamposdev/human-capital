import { IsOptional, IsString } from 'class-validator';

export class EndProjectActionPeopleParticipationDto {
  @IsOptional()
  @IsString()
  endsAt?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string | null;
}
