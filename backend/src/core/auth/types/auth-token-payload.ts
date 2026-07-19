export type AuthTokenPayload = {
  sub: string;
  tenantId: string;
  tenantSlug?: string | null;
  email: string;
  name?: string | null;
  tenantName?: string | null;
};
