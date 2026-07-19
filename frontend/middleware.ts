import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const RESERVED_SEGMENTS = new Set([
  "_next",
  "api",
  "auth",
  "dashboard",
  "people",
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

const LEGACY_PREFIXES = [
  "/dashboard",
  "/people",
  "/settings",
  "/admin",
  "/auth/profile",
  "/auth/login",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const legacyPath = LEGACY_PREFIXES.find((prefix) =>
    pathname.startsWith(prefix),
  );
  if (legacyPath) {
    const slug = req.cookies.get("terceirogestor_tenant")?.value;
    if (slug) {
      const url = req.nextUrl.clone();
      url.pathname = `/${slug}${pathname}`;
      return NextResponse.redirect(url);
    }
  }

  const legacyTenantMatch = pathname.match(/^\/t\/([^/]+)\/?$/);
  if (legacyTenantMatch) {
    const slug = legacyTenantMatch[1];
    const url = req.nextUrl.clone();
    url.pathname = `/${slug}/dashboard`;
    return NextResponse.redirect(url);
  }

  const segments = pathname.split("/");
  const first = segments[1] ?? "";
  if (!first || RESERVED_SEGMENTS.has(first)) {
    return NextResponse.next();
  }
  if (segments.length === 2 || (segments.length === 3 && segments[2] === "")) {
    const url = req.nextUrl.clone();
    url.pathname = `/${first}/dashboard`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/t/:slug",
    "/t/:slug/",
    "/:slug",
    "/:slug/",
    "/dashboard",
    "/people/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/auth/profile",
    "/auth/login",
  ],
};
