"use client";

import type { Domain } from "./types";

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const paddedValue = padded + "=".repeat(padLength);
  return Buffer.from(paddedValue, "base64").toString("utf8");
}

export function serializeDomain(domain: Domain) {
  if (!domain) return "";
  return toBase64Url(JSON.stringify(domain));
}

export function parseDomain(value: string | null | undefined): Domain {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  try {
    const json = fromBase64Url(raw);
    const parsed = JSON.parse(json) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as Domain;
  } catch {
    return null;
  }
}

