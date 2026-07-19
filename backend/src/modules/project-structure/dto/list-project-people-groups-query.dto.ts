import { IsEnum, IsOptional } from 'class-validator';
import { ParticipationKind } from '../../../generated/prisma';

export class ListProjectPeopleGroupsQueryDto {
  @IsOptional()
  @IsEnum(ParticipationKind)
  participationKind?: ParticipationKind;
}
