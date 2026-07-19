import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { PeopleSegmentsController } from './people-segments.controller';
import { PeopleSegmentsService } from './people-segments.service';

@Module({
  imports: [PrismaModule],
  controllers: [PeopleSegmentsController],
  providers: [PeopleSegmentsService],
})
export class PeopleSegmentsModule {}
