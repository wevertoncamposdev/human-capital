import { Injectable, NotFoundException } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

type TenantRequest = Request & {
  tenantId?: string;
  tenantSlug?: string;
};

function extractTenantSlug(url: string) {
  const [path, query] = url.split('?');
  const match = path.match(/^\/t\/([^/]+)(\/.*)?$/);
  if (!match) return null;
  const slug = decodeURIComponent(match[1]);
  const rest = match[2] && match[2].length > 0 ? match[2] : '/';
  return { slug, rest, query };
}

@Injectable()
export class TenancyMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: TenantRequest, _res: Response, next: NextFunction) {
    const originalUrl = req.originalUrl ?? req.url;
    const tenantInfo = extractTenantSlug(originalUrl);
    if (!tenantInfo) {
      return next();
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantInfo.slug },
      select: { id: true, slug: true },
    });
    if (!tenant) {
      throw new NotFoundException('Instituicao nao encontrada');
    }

    req.tenantId = tenant.id;
    req.tenantSlug = tenant.slug;
    req.url = tenantInfo.rest + (tenantInfo.query ? `?${tenantInfo.query}` : '');

    return next();
  }
}
