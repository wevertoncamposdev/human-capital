import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreatePeopleSegmentMembershipDto {
  @IsString()
  personId: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;
}
