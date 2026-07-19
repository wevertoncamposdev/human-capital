const TENANT_STORAGE_KEY = "terceirogestor:tenantSlug";
const TENANT_COOKIE_KEY = "terceirogestor_tenant";
const RESERVED_SEGMENTS = new Set([
  "",
  "_next",
  "api",
  "auth",
  "dashboard",
  "people",
  "person",
  "settings",
  "admin",
  "login",
  "register",
  "t",
  // PWA/static app resources (must not be treated as tenant slugs)
  "manifest.webmanifest",
  "sw.js",
  "icon.png",
  "pwa",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

export function getTenantSlugFromPath(pathname?: string | null) {
  if (!pathname) return null;
  const legacyMatch = pathname.match(/^\/t\/([^/]+)/);
  if (legacyMatch) {
    return decodeURIComponent(legacyMatch[1]);
  }
  const segments = pathname.split("/");
  const first = segments[1] ?? "";
  if (!first || RESERVED_SEGMENTS.has(first)) return null;
  return decodeURIComponent(first);
}

export function readStoredTenantSlug() {
  if (typeof window === "undefined") return null;
  const stored = window.sessionStorage.getItem(TENANT_STORAGE_KEY);
  if (stored) return stored;
  const cookie = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${TENANT_COOKIE_KEY}=`));
  if (!cookie) return null;
  const value = cookie.split("=").slice(1).join("=");
  return value ? decodeURIComponent(value) : null;
}

export function storeTenantSlug(slug: string) {
  if (typeof window === "undefined") return;
  if (!slug) return;
  window.sessionStorage.setItem(TENANT_STORAGE_KEY, slug);
  document.cookie = `${TENANT_COOKIE_KEY}=${encodeURIComponent(
    slug,
  )}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
}

export function getTenantSlug() {
  if (typeof window === "undefined") return null;
  return (
    getTenantSlugFromPath(window.location.pathname) || readStoredTenantSlug()
  );
}

export function withTenantPath(path: string, slug?: string | null) {
  if (!slug) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized.startsWith("/t/")) {
    const rest = normalized.replace(/^\/t\/[^/]+/, "");
    return rest ? `/${slug}${rest}` : `/${slug}`;
  }
  if (normalized === `/${slug}` || normalized.startsWith(`/${slug}/`)) {
    return normalized;
  }
  if (normalized === "/") {
    return `/${slug}`;
  }
  return `/${slug}${normalized}`;
}

export function withTenantApiPath(path: string, slug?: string | null) {
  if (!slug) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized.startsWith("/t/")) {
    const rest = normalized.replace(/^\/t\/[^/]+/, "");
    return rest ? `/t/${slug}${rest}` : `/t/${slug}`;
  }
  if (normalized === `/t/${slug}` || normalized.startsWith(`/t/${slug}/`)) {
    return normalized;
  }
  if (normalized === "/") {
    return `/t/${slug}`;
  }
  return `/t/${slug}${normalized}`;
}

export function resolveTenantPath(path: string) {
  return withTenantPath(path, getTenantSlug());
}
