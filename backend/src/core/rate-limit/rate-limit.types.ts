export type RateLimitKeyPart =
  | 'ip'
  | 'tenantId'
  | 'path'
  | 'method'
  | 'bodyField';

export type RateLimitOptions = {
  name: string;
  windowMs: number;
  max: number;
  bodyField?: string;
  keyParts?: RateLimitKeyPart[];
  message?: string;
};
