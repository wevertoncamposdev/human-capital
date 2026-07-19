import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import type { JwtUser } from '../../core/auth/strategies/jwt.strategy';
import { Permissions } from '../../core/authorization/permissions.decorator';
import { PermissionsGuard } from '../../core/authorization/permissions.guard';
import { TenantsService } from './tenants.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getCurrentTenant(@CurrentUser() user: JwtUser) {
    return this.tenantsService.getTenant(user.tenantId);
  }

  @Get('slug/:slug')
  async getTenantBySlug(@Param('slug') slug: string) {
    return this.tenantsService.getTenantBySlug(slug);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('tenants.update')
  async updateCurrentTenant(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.tenantsService.updateTenant(user.tenantId, dto);
  }
}
