import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsGuard } from './permissions.guard';

@Module({
  imports: [PrismaModule],
  providers: [PermissionsGuard],
  exports: [PermissionsGuard],
})
export class AuthorizationModule {}
