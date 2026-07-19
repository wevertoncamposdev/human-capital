import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { PERMISSIONS_KEY } from './permissions.decorator';
import type { JwtUser } from '../auth/strategies/jwt.strategy';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtUser | undefined;
    if (!user) {
      throw new UnauthorizedException('Usuario nao autenticado');
    }

    const roles = await this.prisma.role.findMany({
      where: {
        tenantId: user.tenantId,
        users: { some: { userId: user.userId } },
      },
      select: { id: true, name: true },
    });

    if (!roles.length) {
      throw new ForbiddenException('Permissao negada');
    }

    const permissions = await this.prisma.rolePermission.findMany({
      where: {
        tenantId: user.tenantId,
        roleId: { in: roles.map((role) => role.id) },
      },
      include: { permission: true },
    });

    const keys = new Set(permissions.map((entry) => entry.permission.key));
    const hasAll = required.every((permission) => keys.has(permission));

    if (!hasAll) {
      throw new ForbiddenException('Permissao negada');
    }

    return true;
  }
}
