import { IsUUID } from 'class-validator';

export class CreateTaskDependencyDto {
  @IsUUID('4')
  dependsOnTaskId: string;
}
