"use client";

import { isTokenExpired } from "@/lib/auth-utils";
import { getTenantSlug, withTenantApiPath } from "@/lib/tenant-path";

const DEFAULT_API_URL = "http://localhost:3001";
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1"]);

const envApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";

function normalizeApiUrl(url: string) {
  return url.replace(/\/+$/, "");
}

function resolveBrowserApiUrl() {
  if (envApiUrl) {
    return normalizeApiUrl(envApiUrl);
  }

  if (typeof window === "undefined") {
    return DEFAULT_API_URL;
  }

  if (LOCAL_HOSTNAMES.has(window.location.hostname)) {
    return `${window.location.protocol}//${window.location.hostname}:3001`;
  }

  // Outside localhost, default to same-origin /api to avoid coupling browser
  // traffic to a Docker-only host/port convention.
  return `${window.location.origin}/api`;
}

export const API_URL = resolveBrowserApiUrl();

function normalizeLegacyMediaUrl(url: string) {
  try {
    const parsed = new URL(url);
    const isLegacyLocalBackend =
      LOCAL_HOSTNAMES.has(parsed.hostname) && parsed.port === "3001";

    if (isLegacyLocalBackend && parsed.pathname.startsWith("/uploads/")) {
      return `${API_URL}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return url;
  }

  return url;
}

export function resolveMediaUrl(url?: string | null) {
  if (!url) return "";

  const normalized = normalizeLegacyMediaUrl(url);
  if (normalized.startsWith("http")) return normalized;
  if (normalized.startsWith("/api/uploads/")) return normalized;
  if (normalized.startsWith("/uploads/")) return `${API_URL}${normalized}`;
  return normalized;
}

export function stripApiUrl(url: string) {
  if (url.startsWith(`${API_URL}/`)) {
    return url.slice(API_URL.length);
  }
  if (url.startsWith("/api/")) {
    return url.slice("/api".length);
  }

  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith("/uploads/")) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return url;
  }

  return url;
}

export type ApiError = {
  message: string;
  status: number;
  details?: unknown;
};

function extractApiErrorMessage(payload: unknown, status: number) {
  const record =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : null;
  const message = record?.message;
  if (typeof message === "string" && message.trim()) return message;
  if (Array.isArray(message) && message.length) {
    const parts = message.map((item) => String(item)).filter(Boolean);
    if (parts.length) return parts.join("\n");
  }
  if (record) {
    const fallback =
      typeof record.error === "string" && record.error.trim()
        ? record.error
        : null;
    if (fallback) return fallback;
  }
  return `Request failed (${status})`;
}

let refreshPromise: Promise<string | null> | null = null;
const inflightGetRequests = new Map<string, Promise<unknown>>();

function withInFlightGetRequest<T>(key: string, load: () => Promise<T>) {
  const existing = inflightGetRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const request = load().finally(() => {
    inflightGetRequests.delete(key);
  });
  inflightGetRequests.set(key, request as Promise<unknown>);
  return request;
}

export async function refreshAccessToken() {
  const slug = getTenantSlug();
  const path = withTenantApiPath("/auth/refresh", slug);
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Cache-Control": "no-store",
      Pragma: "no-cache",
    },
    credentials: "include",
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json().catch(() => null);
  const accessToken = payload?.accessToken;
  if (typeof accessToken !== "string" || !accessToken) {
    return null;
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("auth:token", { detail: { token: accessToken } }),
    );
  }

  return accessToken;
}

async function getRefreshedToken() {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export function buildQuery(
  params?: Record<string, string | number | boolean | undefined>,
) {
  if (!params) return "";
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });
  const text = query.toString();
  return text ? `?${text}` : "";
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const execute = async (
    accessToken: string | null,
    allowRefresh: boolean,
  ): Promise<T> => {
    let nextToken = accessToken;
    if (nextToken && isTokenExpired(nextToken) && allowRefresh) {
      nextToken = await getRefreshedToken();
    }

    if (nextToken && isTokenExpired(nextToken)) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      }
      const error: ApiError = {
        message: "Sessao expirada. Faca login novamente.",
        status: 401,
      };
      throw error;
    }

    const headers = new Headers(options.headers);
    if (!headers.has("Content-Type") && options.body) {
      headers.set("Content-Type", "application/json");
    }
    if (!headers.has("Cache-Control")) {
      headers.set("Cache-Control", "no-store");
    }
    if (!headers.has("Pragma")) {
      headers.set("Pragma", "no-cache");
    }
    if (nextToken) {
      headers.set("Authorization", `Bearer ${nextToken}`);
    }

    const tenantSlug = getTenantSlug();
    const resolvedPath = withTenantApiPath(path, tenantSlug);
    const response = await fetch(`${API_URL}${resolvedPath}`, {
      ...options,
      headers,
      cache: "no-store",
      credentials: "include",
    });

    const contentType = response.headers.get("content-type") ?? "";
    const isJson = contentType.includes("application/json");
    const payload = isJson ? await response.json().catch(() => ({})) : null;

    if (!response.ok) {
      if (response.status === 401 && allowRefresh) {
        const refreshed = await getRefreshedToken();
        if (refreshed) {
          return execute(refreshed, false);
        }
      }
      if (response.status === 401 && typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      }
      const message = extractApiErrorMessage(payload, response.status);
      const error: ApiError = {
        message,
        status: response.status,
        details: payload,
      };
      throw error;
    }

    return payload as T;
  };

  const method = String(options.method ?? "GET").toUpperCase();
  const tenantSlug = getTenantSlug() ?? "";
  const canDeduplicate = method === "GET" && !options.body;

  if (!canDeduplicate) {
    return execute(token ?? null, true);
  }

  const requestKey = JSON.stringify([tenantSlug, path, token ?? null]);
  return withInFlightGetRequest(requestKey, () => execute(token ?? null, true));
}

export async function publicApiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", "no-store");
  }
  if (!headers.has("Pragma")) {
    headers.set("Pragma", "no-cache");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store",
    credentials: "include",
  });

  const contentType = response.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json().catch(() => ({})) : null;

  if (!response.ok) {
    const message = extractApiErrorMessage(payload, response.status);
    const error: ApiError = {
      message,
      status: response.status,
      details: payload,
    };
    throw error;
  }

  return payload as T;
}
