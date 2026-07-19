import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { RequestContextService } from './request-context.service';

type RequestWithTenant = Request & {
  tenantId?: string;
  tenantSlug?: string;
};

function resolveRequestId(req: Request) {
  const headerId = req.headers['x-request-id'];
  if (typeof headerId === 'string' && headerId.trim().length > 0) {
    return headerId.trim();
  }
  const correlationId = req.headers['x-correlation-id'];
  if (typeof correlationId === 'string' && correlationId.trim().length > 0) {
    return correlationId.trim();
  }
  return randomUUID();
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly requestContext: RequestContextService) {}

  use(req: RequestWithTenant, res: Response, next: NextFunction) {
    const requestId = resolveRequestId(req);
    res.setHeader('x-request-id', requestId);
    const userAgentHeader = req.headers['user-agent'];
    const userAgent = Array.isArray(userAgentHeader)
      ? userAgentHeader.join('; ')
      : userAgentHeader;

    this.requestContext.run(
      {
        requestId,
        ipAddress: req.ip,
        userAgent: userAgent ?? null,
        tenantId: req.tenantId ?? null,
        tenantSlug: req.tenantSlug ?? null,
        method: req.method,
        path: req.originalUrl ?? req.url,
      },
      () => next(),
    );
  }
}
