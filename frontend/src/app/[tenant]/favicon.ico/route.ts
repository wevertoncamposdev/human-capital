import { NextRequest, NextResponse } from "next/server";
import {
  fetchTenantPreviewBySlug,
  getServerApiUrl,
  resolveServerMediaUrl,
} from "@/lib/server/tenant-preview";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tenant: string }> },
) {
  const { tenant: tenantSlug } = await context.params;
  const tenant = await fetchTenantPreviewBySlug(tenantSlug);
  const logoUrl = tenant?.logoUrl ? String(tenant.logoUrl) : "";
  if (!logoUrl.trim()) {
    return NextResponse.redirect(new URL("/favicon.ico", request.url));
  }

  const apiUrl = getServerApiUrl();
  const resolved = resolveServerMediaUrl(logoUrl, apiUrl);

  if (resolved.startsWith("/")) {
    return NextResponse.redirect(new URL(resolved, request.url));
  }

  const response = await fetch(resolved, { cache: "no-store" });
  if (!response.ok) {
    return NextResponse.redirect(new URL("/favicon.ico", request.url));
  }

  const contentType =
    response.headers.get("content-type") ?? "image/png";
  const body = await response.arrayBuffer();

  return new NextResponse(body, {
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=300",
    },
  });
}
