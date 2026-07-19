type TenantPreview = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
};

const DEFAULT_API_URL = "http://localhost:3001";

export function getServerApiUrl() {
  return (
    process.env.API_INTERNAL_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    DEFAULT_API_URL
  );
}

export async function fetchTenantPreviewBySlug(
  tenantSlug: string,
): Promise<TenantPreview | null> {
  const apiUrl = getServerApiUrl();
  const response = await fetch(
    `${apiUrl}/tenants/slug/${encodeURIComponent(tenantSlug)}`,
    { cache: "no-store" },
  );
  if (!response.ok) return null;
  return (await response.json().catch(() => null)) as TenantPreview | null;
}

export function resolveServerMediaUrl(url: string, apiUrl: string) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/uploads/")) return `${apiUrl}${url}`;
  return url;
}
