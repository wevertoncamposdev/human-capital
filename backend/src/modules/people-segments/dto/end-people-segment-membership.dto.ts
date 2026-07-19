import { IsDateString, IsOptional, IsString } from 'class-validator';

export class EndPeopleSegmentMembershipDto {
  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string;
}
