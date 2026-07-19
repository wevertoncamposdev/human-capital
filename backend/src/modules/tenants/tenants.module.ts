import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthorizationModule } from '../../core/authorization/authorization.module';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

@Module({
  imports: [PrismaModule, AuthorizationModule],
  controllers: [TenantsController],
  providers: [TenantsService],
})
export class TenantsModule {}
