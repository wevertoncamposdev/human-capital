import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

function loadRootEnv() {
  const envPaths = [
    path.resolve(__dirname, "..", ".env.local"),
    path.resolve(__dirname, "..", ".env"),
  ];

  for (const filepath of envPaths) {
    if (!fs.existsSync(filepath)) continue;

    const content = fs.readFileSync(filepath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const idx = line.indexOf("=");
      if (idx === -1) continue;

      const key = line.slice(0, idx).trim();
      if (!key || process.env[key] !== undefined) continue;

      let value = line.slice(idx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] = value;
    }
  }
}

loadRootEnv();

function resolveImageRemotePatterns() {
  const patterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [
    { protocol: "http", hostname: "localhost", pathname: "/**" },
    { protocol: "http", hostname: "127.0.0.1", pathname: "/**" },
    { protocol: "http", hostname: "localhost", port: "3001", pathname: "/**" },
    { protocol: "http", hostname: "127.0.0.1", port: "3001", pathname: "/**" },
  ];

  const raw = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();
  if (raw.startsWith("http")) {
    try {
      const parsed = new URL(raw);
      patterns.push({
        protocol: parsed.protocol.replace(":", "") as "http" | "https",
        hostname: parsed.hostname,
        port: parsed.port || undefined,
        pathname: "/**",
      });
    } catch {
      // Ignore invalid URLs.
    }
  }

  const webUrl = (process.env.WEB_URL ?? "").trim();
  if (webUrl.startsWith("http")) {
    try {
      const parsed = new URL(webUrl);
      patterns.push({
        protocol: parsed.protocol.replace(":", "") as "http" | "https",
        hostname: parsed.hostname,
        port: parsed.port || undefined,
        pathname: "/**",
      });
    } catch {
      // Ignore invalid URLs.
    }
  }

  return patterns;
}

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: resolveImageRemotePatterns(),
  },
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];

    const publicApiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").trim();
    if (!publicApiUrl || !publicApiUrl.startsWith("/")) return [];

    const internal = (process.env.API_INTERNAL_URL ?? "http://localhost:3001")
      .trim()
      .replace(/\/+$/, "");

    return [
      {
        source: `${publicApiUrl}/:path*`,
        destination: `${internal}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
