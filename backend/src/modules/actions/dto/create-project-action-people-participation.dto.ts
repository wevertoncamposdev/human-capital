import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import {
  ActionPeopleParticipationRole,
  ParticipationKind,
} from '../../../generated/prisma';

export class CreateProjectActionPeopleParticipationDto {
  @IsUUID('4')
  personId!: string;

  @IsOptional()
  @IsUUID('4')
  enrollmentId?: string;

  @IsOptional()
  @IsEnum(ActionPeopleParticipationRole)
  role?: ActionPeopleParticipationRole;

  @IsOptional()
  @IsEnum(ParticipationKind)
  participationKind?: ParticipationKind;

  @IsOptional()
  @IsString()
  startsAt?: string;

  @IsOptional()
  @IsString()
  internalNotes?: string | null;
}
