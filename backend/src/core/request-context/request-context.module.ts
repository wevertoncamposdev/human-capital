import { Module } from '@nestjs/common';
import { RequestContextService } from './request-context.service';
import { RequestContextMiddleware } from './request-context.middleware';
import { RequestContextInterceptor } from './request-context.interceptor';

@Module({
  providers: [
    RequestContextService,
    RequestContextMiddleware,
    RequestContextInterceptor,
  ],
  exports: [
    RequestContextService,
    RequestContextMiddleware,
    RequestContextInterceptor,
  ],
})
export class RequestContextModule {}
