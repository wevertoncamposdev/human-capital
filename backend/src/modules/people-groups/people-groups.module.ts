import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { PeopleGroupsController } from './people-groups.controller';
import { PeopleGroupsService } from './people-groups.service';

@Module({
  imports: [PrismaModule],
  controllers: [PeopleGroupsController],
  providers: [PeopleGroupsService],
})
export class PeopleGroupsModule {}
