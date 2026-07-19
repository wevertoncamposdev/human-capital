import { IsEnum, IsUUID } from 'class-validator';
import { ParticipationKind } from '../../../generated/prisma';

export class CreateProjectPeopleGroupDto {
  @IsUUID('4')
  peopleGroupId: string;

  @IsEnum(ParticipationKind)
  participationKind: ParticipationKind;
}
