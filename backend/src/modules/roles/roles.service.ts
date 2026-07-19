import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async listRoles(tenantId: string) {
    const roles = await this.prisma.role.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions.map((entry) => ({
        id: entry.permission.id,
        key: entry.permission.key,
        description: entry.permission.description,
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));
  }

  async createRole(tenantId: string, dto: CreateRoleDto) {
    const role = await this.prisma.role.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description ?? null,
      },
    });

    const permissionIds = await this.resolvePermissionIds(dto.permissionKeys);
    if (permissionIds.length) {
      await this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          tenantId,
          roleId: role.id,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }

    return this.getRoleDetail(tenantId, role.id);
  }

  async updateRole(tenantId: string, roleId: string, dto: UpdateRoleDto) {
    const existing = await this.prisma.role.findFirst({
      where: { id: roleId, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Perfil nao encontrado');
    }

    await this.prisma.role.update({
      where: { id: roleId },
      data: {
        name: dto.name ?? existing.name,
        description: dto.description ?? existing.description,
      },
    });

    if (dto.permissionKeys) {
      const permissionIds = await this.resolvePermissionIds(dto.permissionKeys);
      await this.syncRolePermissions(tenantId, roleId, permissionIds);
    }

    return this.getRoleDetail(tenantId, roleId);
  }

  async deleteRole(tenantId: string, roleId: string) {
    const existing = await this.prisma.role.findFirst({
      where: { id: roleId, tenantId },
    });
    if (!existing) {
      throw new NotFoundException('Perfil nao encontrado');
    }

    await this.prisma.rolePermission.deleteMany({
      where: { tenantId, roleId },
    });
    await this.prisma.userRole.deleteMany({
      where: { tenantId, roleId },
    });
    await this.prisma.role.delete({
      where: { id: roleId },
    });

    return { ok: true };
  }

  async getRoleDetail(tenantId: string, roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, tenantId },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
    if (!role) {
      throw new NotFoundException('Perfil nao encontrado');
    }
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      permissions: role.permissions.map((entry) => ({
        id: entry.permission.id,
        key: entry.permission.key,
        description: entry.permission.description,
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  private async resolvePermissionIds(permissionKeys?: string[]) {
    if (!permissionKeys || !permissionKeys.length) return [];
    const permissions = await this.prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
      select: { id: true },
    });
    return permissions.map((permission) => permission.id);
  }

  private async syncRolePermissions(
    tenantId: string,
    roleId: string,
    permissionIds: string[],
  ) {
    const current = await this.prisma.rolePermission.findMany({
      where: { tenantId, roleId },
      select: { permissionId: true },
    });
    const currentIds = new Set(current.map((item) => item.permissionId));
    const targetIds = new Set(permissionIds);

    const toRemove = Array.from(currentIds).filter(
      (permissionId) => !targetIds.has(permissionId),
    );
    const toAdd = Array.from(targetIds).filter(
      (permissionId) => !currentIds.has(permissionId),
    );

    if (toRemove.length) {
      await this.prisma.rolePermission.deleteMany({
        where: { tenantId, roleId, permissionId: { in: toRemove } },
      });
    }

    if (toAdd.length) {
      await this.prisma.rolePermission.createMany({
        data: toAdd.map((permissionId) => ({
          tenantId,
          roleId,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }
  }
}
