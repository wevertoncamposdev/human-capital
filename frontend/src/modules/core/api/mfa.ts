import { apiRequest } from "@/lib/api";

export type TotpSetupResponse = {
  setupId: string;
  secret: string;
  otpauthUrl: string;
  expiresAt: string;
};

export async function setupTotp(token: string) {
  return apiRequest<TotpSetupResponse>(
    "/auth/mfa/totp/setup",
    { method: "POST" },
    token,
  );
}

export async function confirmTotp(
  token: string,
  input: { setupId: string; code: string },
) {
  return apiRequest<{ recoveryCodes: string[] }>(
    "/auth/mfa/totp/confirm",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    token,
  );
}

export async function disableTotp(token: string, input: { code: string }) {
  return apiRequest<{ ok: true }>(
    "/auth/mfa/totp/disable",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    token,
  );
}

