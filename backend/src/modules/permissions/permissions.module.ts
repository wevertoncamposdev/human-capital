import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthorizationModule } from '../../core/authorization/authorization.module';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { PermissionsSyncService } from './permissions-sync.service';

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [PermissionsController],
  providers: [PermissionsService, PermissionsSyncService],
})
export class PermissionsModule {}
