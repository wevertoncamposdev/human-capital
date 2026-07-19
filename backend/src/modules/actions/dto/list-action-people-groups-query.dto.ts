import { IsEnum, IsOptional } from 'class-validator';
import { ParticipationKind } from '../../../generated/prisma';

export class ListActionPeopleGroupsQueryDto {
  @IsOptional()
  @IsEnum(ParticipationKind)
  participationKind?: ParticipationKind;
}
