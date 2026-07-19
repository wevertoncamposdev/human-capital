import { SetMetadata } from '@nestjs/common';
import type { RateLimitOptions } from './rate-limit.types';

export const RATE_LIMIT_OPTIONS = 'rateLimitOptions';

export function RateLimit(options: RateLimitOptions) {
  return SetMetadata(RATE_LIMIT_OPTIONS, options);
}
