import { IsUUID } from 'class-validator';

export class AddEnrollmentGroupDto {
  @IsUUID('4')
  groupId: string;
}

