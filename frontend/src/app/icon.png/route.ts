import { NextResponse } from "next/server";
import {
  getServerApiUrl,
  resolveServerMediaUrl,
} from "@/lib/server/tenant-preview";

const FALLBACK_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jKp0AAAAASUVORK5CYII=";

export async function GET() {
  const apiUrl = getServerApiUrl();
  const logoUrl = resolveServerMediaUrl("/uploads/system/logo.png", apiUrl);

  const response = await fetch(logoUrl, { cache: "no-store" });
  if (!response.ok) {
    const body = Buffer.from(FALLBACK_PNG_BASE64, "base64");
    return new NextResponse(body, {
      headers: {
        "content-type": "image/png",
        "cache-control": "public, max-age=60",
      },
    });
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
