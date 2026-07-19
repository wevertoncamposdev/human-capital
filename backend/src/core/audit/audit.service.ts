import { Injectable } from '@nestjs/common';
import type { AuditLogAction } from '../../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async getAuditLogById(tenantId: string, id: string) {
    return this.prisma.auditLog.findFirstOrThrow({
      where: {
        id,
        tenantId,
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });
  }

  async listAuditLogs(
    tenantId: string,
    params: {
      page?: number;
      limit?: number;
      action?: AuditLogAction;
      entity?: string;
      entityId?: string;
      userId?: string;
      from?: Date;
      to?: Date;
      search?: string;
    },
  ) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit =
      params.limit && params.limit > 0 ? Math.min(params.limit, 200) : 20;
    const skip = (page - 1) * limit;
    const action = params.action;
    const entity = params.entity?.trim();
    const entityId = params.entityId?.trim();
    const userId = params.userId?.trim();
    const from = params.from;
    const to = params.to;
    const search = params.search?.trim();
    const searchAction = search ? search.toUpperCase() : undefined;
    const actionCandidate =
      searchAction === 'CREATE' ||
      searchAction === 'UPDATE' ||
      searchAction === 'DELETE'
        ? (searchAction as AuditLogAction)
        : undefined;

    const where = {
      tenantId,
      ...(action ? { action } : {}),
      ...(entity
        ? { entity: { contains: entity } }
        : {}),
      ...(entityId ? { entityId } : {}),
      ...(userId ? { userId } : {}),
      ...(from || to
        ? {
            createdAt: {
              ...(from ? { gte: from } : {}),
              ...(to ? { lte: to } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { entity: { contains: search } },
              { entityId: { contains: search } },
              { requestId: { contains: search } },
              ...(actionCandidate ? [{ action: actionCandidate }] : []),
              {
                user: {
                  name: { contains: search },
                },
              },
              {
                user: {
                  email: { contains: search },
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }
}
