import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import {
  EnrollmentStatus,
  ParticipationKind,
  ProjectParticipationRole,
} from '../../../generated/prisma';

export class CreateProjectEnrollmentDto {
  @IsUUID('4')
  personId: string;

  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;

  @IsOptional()
  @IsEnum(ProjectParticipationRole)
  role?: ProjectParticipationRole;

  @IsOptional()
  @IsEnum(ParticipationKind)
  participationKind?: ParticipationKind;

  @IsOptional()
  @IsDateString()
  startsAt?: string | null;

  @IsOptional()
  @IsDateString()
  endsAt?: string | null;
}
