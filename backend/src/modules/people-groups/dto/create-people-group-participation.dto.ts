import { IsOptional, IsString } from 'class-validator';

export class CreatePeopleGroupParticipationDto {
  @IsString()
  personId: string;

  @IsOptional()
  @IsString()
  startsAt?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;
}
