import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export type RequestContextStore = {
  requestId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  userId?: string | null;
  tenantId?: string | null;
  tenantSlug?: string | null;
  method?: string | null;
  path?: string | null;
  disableAudit?: boolean | null;
};

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContextStore>();

  run(context: RequestContextStore, next: () => void) {
    this.storage.run(context, next);
  }

  get() {
    return this.storage.getStore();
  }

  update(partial: Partial<RequestContextStore>) {
    const current = this.storage.getStore();
    if (!current) return;
    Object.assign(current, partial);
  }
}
