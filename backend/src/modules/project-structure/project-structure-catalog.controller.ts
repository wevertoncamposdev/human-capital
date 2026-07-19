import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import type { JwtUser } from '../../core/auth/strategies/jwt.strategy';
import { Permissions } from '../../core/authorization/permissions.decorator';
import { PermissionsGuard } from '../../core/authorization/permissions.guard';
import { ProjectStructureService } from './project-structure.service';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller()
export class ProjectStructureCatalogController {
  constructor(private readonly service: ProjectStructureService) {}

  @Get('project-groups')
  @Permissions('project-structure.read')
  async listAllGroups(
    @CurrentUser() user: JwtUser,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('all') all?: string,
  ) {
    return this.service.listAllGroups(user.tenantId, {
      q,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      all: all === 'true',
    });
  }
}
