import { Injectable } from '@nestjs/common';

type Bucket = {
  count: number;
  resetAt: number;
};

@Injectable()
export class RateLimitService {
  private readonly buckets = new Map<string, Bucket>();

  consume(key: string, windowMs: number, max: number) {
    const now = Date.now();
    const existing = this.buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      const next: Bucket = { count: 1, resetAt: now + windowMs };
      this.buckets.set(key, next);
      return {
        allowed: true,
        remaining: Math.max(0, max - 1),
        resetAt: next.resetAt,
      };
    }

    existing.count += 1;

    const remaining = Math.max(0, max - existing.count);
    if (existing.count > max) {
      return { allowed: false, remaining: 0, resetAt: existing.resetAt };
    }

    return { allowed: true, remaining, resetAt: existing.resetAt };
  }
}
