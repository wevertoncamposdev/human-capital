import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const user = req.user as { tenantId?: string } | undefined;

    if (!user?.tenantId) {
      return false;
    }

    (req as Request & { tenantId?: string }).tenantId = user.tenantId;
    return true;
  }
}
