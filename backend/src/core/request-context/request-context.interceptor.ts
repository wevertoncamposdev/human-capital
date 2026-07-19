import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import type { JwtUser } from '../auth/strategies/jwt.strategy';
import { RequestContextService } from './request-context.service';

type RequestWithUser = Request & {
  user?: JwtUser;
  tenantId?: string;
  tenantSlug?: string;
};

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  constructor(private readonly requestContext: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const user = req?.user;
    this.requestContext.update({
      userId: user?.userId ?? null,
      tenantId: user?.tenantId ?? req?.tenantId ?? null,
      tenantSlug: user?.tenantSlug ?? req?.tenantSlug ?? null,
    });
    return next.handle();
  }
}
