import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPermissions() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: { key: 'asc' },
    });
    return permissions.map((permission) => ({
      id: permission.id,
      key: permission.key,
      description: permission.description,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
    }));
  }
}
