import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { ProjectStructureCatalogController } from './project-structure-catalog.controller';
import { ProjectStructureController } from './project-structure.controller';
import { ProjectStructureService } from './project-structure.service';

@Module({
  imports: [PrismaModule],
  controllers: [ProjectStructureController, ProjectStructureCatalogController],
  providers: [ProjectStructureService],
})
export class ProjectStructureModule {}
