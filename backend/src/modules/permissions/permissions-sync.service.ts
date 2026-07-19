import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { REQUIRED_PERMISSIONS } from './required-permissions';

@Injectable()
export class PermissionsSyncService implements OnModuleInit {
  private readonly logger = new Logger(PermissionsSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await Promise.all(
      REQUIRED_PERMISSIONS.map((permission) =>
        this.prisma.permission.upsert({
          where: { key: permission.key },
          update: { description: permission.description },
          create: { key: permission.key, description: permission.description },
        }),
      ),
    );

    this.logger.debug(
      `Synced ${REQUIRED_PERMISSIONS.length} required permissions`,
    );
  }
}

