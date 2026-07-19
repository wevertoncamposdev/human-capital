type JwtPayload = Record<string, unknown>;

export const decodeJwtPayload = (token: string): JwtPayload | null => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded =
      base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
};

export const getTokenExpirationMs = (token: string) => {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (typeof exp !== "number") return null;
  return exp * 1000;
};

export const isTokenExpired = (token: string, skewSeconds = 30) => {
  const expiresAt = getTokenExpirationMs(token);
  if (!expiresAt) return true;
  return Date.now() >= expiresAt - skewSeconds * 1000;
};

export const buildExportMeta = ({
  token,
  title,
  subtitle,
}: {
  token: string;
  title: string;
  subtitle?: string;
}) => {
  const payload = decodeJwtPayload(token);
  const tenant =
    (payload?.tenantName as string | undefined) ??
    (payload?.tenantId as string | undefined) ??
    "";
  const issuedBy = (payload?.email as string | undefined) ?? "";
  const issuedAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());

  return {
    title,
    subtitle,
    tenant,
    issuedBy,
    issuedAt,
  };
};
