import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './core/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { PeopleModule } from './modules/people/people.module';
import { PantryModule } from './modules/pantry/pantry.module';
import { DepositModule } from './modules/deposit/deposit.module';
import { ProgramsModule } from './modules/programs/programs.module';
import { PeopleSegmentsModule } from './modules/people-segments/people-segments.module';
import { PeopleGroupsModule } from './modules/people-groups/people-groups.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ProjectStructureModule } from './modules/project-structure/project-structure.module';
import { RegistrationModule } from './modules/registration/registration.module';
import { ActionsModule } from './modules/actions/actions.module';
import { PrismaModule } from './core/prisma/prisma.module';
import { FilesModule } from './core/files/files.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { TenancyMiddleware } from './core/tenancy/tenancy.middleware';
import { AuditModule } from './core/audit/audit.module';
import { RequestContextModule } from './core/request-context/request-context.module';
import { RequestContextMiddleware } from './core/request-context/request-context.middleware';
import { RequestContextInterceptor } from './core/request-context/request-context.interceptor';
import { RateLimitModule } from './core/rate-limit/rate-limit.module';
import { RateLimitGuard } from './core/rate-limit/rate-limit.guard';
import { CepModule } from './core/cep/cep.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { TasksModule } from './modules/tasks/tasks.module';

const rootEnvFilePaths = [
  resolve(__dirname, '..', '..', '.env.local'),
  resolve(__dirname, '..', '..', '.env'),
].filter((filepath) => existsSync(filepath));

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: rootEnvFilePaths,
      expandVariables: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: resolve(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    TenantsModule,
    PeopleModule,
    PantryModule,
    DepositModule,
    ProgramsModule,
    PeopleSegmentsModule,
    PeopleGroupsModule,
    ProjectsModule,
    ProjectStructureModule,
    ActionsModule,
    RegistrationModule,
    DashboardModule,
    TasksModule,
    FilesModule,
    AuditModule,
    RequestContextModule,
    RateLimitModule,
    CepModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    TenancyMiddleware,
    RateLimitGuard,
    {
      provide: APP_GUARD,
      useExisting: RateLimitGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenancyMiddleware, RequestContextMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
