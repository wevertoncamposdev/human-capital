import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import type { JwtUser } from '../../core/auth/strategies/jwt.strategy';
import { Permissions } from '../../core/authorization/permissions.decorator';
import { PermissionsGuard } from '../../core/authorization/permissions.guard';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolesService } from './roles.service';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('roles.manage')
  async listRoles(@CurrentUser() user: JwtUser) {
    return this.rolesService.listRoles(user.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('roles.manage')
  async getRole(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.rolesService.getRoleDetail(user.tenantId, id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('roles.manage')
  async createRole(@CurrentUser() user: JwtUser, @Body() dto: CreateRoleDto) {
    return this.rolesService.createRole(user.tenantId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('roles.manage')
  async updateRole(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.rolesService.updateRole(user.tenantId, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('roles.manage')
  async deleteRole(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.rolesService.deleteRole(user.tenantId, id);
  }
}
