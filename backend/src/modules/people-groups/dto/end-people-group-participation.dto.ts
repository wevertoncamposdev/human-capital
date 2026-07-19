import { IsOptional, IsString } from 'class-validator';

export class EndPeopleGroupParticipationDto {
  @IsOptional()
  @IsString()
  endsAt?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;
}
