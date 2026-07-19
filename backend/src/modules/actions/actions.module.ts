import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { ActionsListController } from './actions-list.controller';
import { ActionTypesController } from './action-types.controller';
import { ProjectActionsController } from './project-actions.controller';
import { ActionsService } from './actions.service';

@Module({
  imports: [PrismaModule],
  controllers: [ActionsListController, ActionTypesController, ProjectActionsController],
  providers: [ActionsService],
})
export class ActionsModule {}

