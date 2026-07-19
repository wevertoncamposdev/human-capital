import { NextRequest, NextResponse } from "next/server";
import {
  getServerApiUrl,
  resolveServerMediaUrl,
} from "@/lib/server/tenant-preview";

export async function GET(request: NextRequest) {
  const apiUrl = getServerApiUrl();
  const logoUrl = resolveServerMediaUrl("/uploads/system/logo.png", apiUrl);

  const response = await fetch(logoUrl, { cache: "no-store" });
  if (!response.ok) {
    return NextResponse.redirect(new URL("/icon.png", request.url));
  }

  const contentType = response.headers.get("content-type") ?? "image/png";
  const body = await response.arrayBuffer();
  return new NextResponse(body, {
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=300",
    },
  });
}

