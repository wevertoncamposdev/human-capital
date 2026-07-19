import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { RATE_LIMIT_OPTIONS } from './rate-limit.decorator';
import type { RateLimitOptions } from './rate-limit.types';
import { RateLimitService } from './rate-limit.service';

type TenantRequest = Request & { tenantId?: string };

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly limiter: RateLimitService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_OPTIONS,
      [context.getHandler(), context.getClass()],
    );
    if (!options) return true;

    const req = context.switchToHttp().getRequest<TenantRequest>();
    const key = this.buildKey(req, options);
    const result = this.limiter.consume(key, options.windowMs, options.max);
    if (result.allowed) return true;

    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((result.resetAt - Date.now()) / 1000),
    );
    throw new HttpException(
      {
        message:
          options.message ?? 'Muitas tentativas. Tente novamente mais tarde.',
        retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private buildKey(req: TenantRequest, options: RateLimitOptions) {
    const parts = new Array<string>();
    const keyParts = options.keyParts?.length
      ? options.keyParts
      : ['ip', 'path', 'method'];

    for (const part of keyParts) {
      if (part === 'ip') {
        parts.push(req.ip ?? '');
        continue;
      }
      if (part === 'tenantId') {
        parts.push(req.tenantId ?? '');
        continue;
      }
      if (part === 'path') {
        parts.push(req.path ?? '');
        continue;
      }
      if (part === 'method') {
        parts.push(req.method ?? '');
        continue;
      }
      if (part === 'bodyField') {
        const field = options.bodyField;
        if (!field) continue;
        const value = (req as any)?.body?.[field];
        parts.push(
          typeof value === 'string'
            ? value.trim().toLowerCase()
            : String(value ?? ''),
        );
      }
    }

    return `${options.name}|${parts.join('|')}`;
  }
}
