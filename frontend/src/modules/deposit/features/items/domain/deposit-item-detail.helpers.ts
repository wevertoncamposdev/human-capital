"use client";

import {
  formatDateOnlyPtBR,
  formatDateTimePtBR,
} from "@/lib/date";
import type {
  ApiDepositEntry,
  ApiDepositExit,
} from "@/modules/deposit/api";
import {
  DEPOSIT_AUDIT_FIELD_LABELS,
  DEPOSIT_DEFAULT_SECTOR,
  DEPOSIT_EXIT_TYPE_LABELS,
} from "@/modules/deposit/shared/domain/deposit.constants";
import type { DetailAuditFeedItem } from "@/web-client/detail/audit-types";

export function toInt(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toNumber(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function localIsoDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function normalizeStringOrNull(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed : null;
}

export function normalizeSector(value: string | null | undefined) {
  return String(value ?? "").trim() || DEPOSIT_DEFAULT_SECTOR;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function resolveExitTypeLabel(type: ApiDepositExit["type"] | string | null | undefined) {
  if (!type) return "Saída";
  if (type in DEPOSIT_EXIT_TYPE_LABELS) {
    return DEPOSIT_EXIT_TYPE_LABELS[type as keyof typeof DEPOSIT_EXIT_TYPE_LABELS];
  }
  return String(type);
}

export function resolveAuditActionLabel(action: DetailAuditFeedItem["action"]) {
  switch (action) {
    case "CREATE":
      return "Criado";
    case "UPDATE":
      return "Atualizado";
    case "DELETE":
      return "Removido";
    default:
      return action;
  }
}

export function formatAuditNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString("pt-BR")
    : "—";
}

export function formatAuditDate(value: unknown) {
  return typeof value === "string" && value.trim()
    ? formatDateOnlyPtBR(value)
    : "—";
}

export function formatAuditReferenceLabel(
  label: string | null | undefined,
  value: unknown,
  fallbackPrefix: string,
) {
  const resolvedLabel = String(label ?? "").trim();
  if (resolvedLabel) return resolvedLabel;

  const id = typeof value === "string" ? value.trim() : "";
  if (!id) return "—";

  return `${fallbackPrefix} #${id.slice(0, 8)}`;
}

export function buildDepositEntryAuditLabel(entry: ApiDepositEntry) {
  const parts = [
    formatDateOnlyPtBR(entry.entryDate),
    `${Number(entry.quantity ?? 0).toLocaleString("pt-BR")} ${entry.unit}`,
  ];

  if (entry.donor?.name) {
    parts.push(entry.donor.name);
  }

  return `Entrada ${parts.join(" | ")}`;
}

export function buildDepositExitAuditLabel(exit: ApiDepositExit) {
  const parts = [
    resolveExitTypeLabel(exit.type),
    formatDateOnlyPtBR(exit.exitDate),
    `${Number(exit.quantity ?? 0).toLocaleString("pt-BR")} ${exit.unit}`,
  ];

  const destinationName = normalizeStringOrNull(exit.destinationName);
  if (destinationName) {
    parts.push(destinationName);
  }

  return `Saída ${parts.join(" | ")}`;
}

function isDateOnlyValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isDateTimeValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}T/.test(value);
}

export function formatAuditValue(
  value: unknown,
  formatter?: ((value: unknown) => string) | undefined,
): string {
  if (formatter) {
    const formatted = String(formatter(value) ?? "").trim();
    if (formatted) return formatted;
  }
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "—";
    if (isDateOnlyValue(trimmed)) return formatDateOnlyPtBR(trimmed);
    if (isDateTimeValue(trimmed)) return formatDateTimePtBR(trimmed);
    return trimmed;
  }
  if (typeof value === "number") return formatAuditNumber(value);
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (Array.isArray(value)) {
    return value.length ? value.map((item) => formatAuditValue(item)).join(", ") : "—";
  }
  return JSON.stringify(value);
}

export function diffAuditFields(log: DetailAuditFeedItem) {
  const before = isRecord(log.before) ? log.before : {};
  const after = isRecord(log.after) ? log.after : {};
  const fieldLabels = log.fieldLabels ?? DEPOSIT_AUDIT_FIELD_LABELS;
  const keys = Object.keys({ ...before, ...after }).filter((key) => key in fieldLabels);

  return keys
    .map((key) => ({
      key,
      label: fieldLabels[key] ?? key,
      before: before[key],
      after: after[key],
      beforeLabel: formatAuditValue(before[key], log.valueFormatters?.[key]),
      afterLabel: formatAuditValue(after[key], log.valueFormatters?.[key]),
    }))
    .filter((row) => JSON.stringify(row.before) !== JSON.stringify(row.after));
}

export function initialsFromLabel(label: string) {
  const cleaned = label.replace(/\s+/g, " ").trim().slice(0, 64);
  if (!cleaned) return "?";
  const parts = cleaned.split(" ").filter(Boolean);
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return `${a}${b}`.toUpperCase();
}

const AVATAR_PALETTE = [
  { bg: "bg-sky-500/15", text: "text-sky-700 dark:text-sky-200" },
  { bg: "bg-violet-500/15", text: "text-violet-700 dark:text-violet-200" },
  { bg: "bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-200" },
  { bg: "bg-amber-500/15", text: "text-amber-800 dark:text-amber-200" },
  { bg: "bg-rose-500/15", text: "text-rose-700 dark:text-rose-200" },
  { bg: "bg-teal-500/15", text: "text-teal-700 dark:text-teal-200" },
] as const;

export function pickAvatarPalette(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[idx]!;
}

function isMeaningfulAuditFormatterValue(formatted: string, value: unknown) {
  if (!formatted) {
    return false;
  }

  if (value === null || value === undefined) {
    return true;
  }

  return formatted !== "—" && formatted !== "-" && formatted !== "-";
}

function normalizeAuditNumberString(value: string) {
  if (!/^-?\d+([.,]\d+)?$/.test(value)) {
    return null;
  }

  const normalized =
    value.includes(",") && !value.includes(".")
      ? value.replace(",", ".")
      : value;
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed.toLocaleString("pt-BR") : null;
}

function formatAuditValueStable(
  value: unknown,
  formatter?: ((value: unknown) => string) | undefined,
): string {
  if (formatter) {
    const formatted = String(formatter(value) ?? "").trim();
    if (isMeaningfulAuditFormatterValue(formatted, value)) {
      return formatted;
    }
  }

  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "-";
    }
    if (isDateOnlyValue(trimmed)) {
      return formatDateOnlyPtBR(trimmed);
    }
    if (isDateTimeValue(trimmed)) {
      return formatDateTimePtBR(trimmed);
    }

    const numericLabel = normalizeAuditNumberString(trimmed);
    if (numericLabel) {
      return numericLabel;
    }

    return trimmed;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value.toLocaleString("pt-BR") : "-";
  }

  if (typeof value === "boolean") {
    return value ? "Sim" : "Não";
  }

  if (Array.isArray(value)) {
    return value.length
      ? value.map((item) => formatAuditValueStable(item)).join(", ")
      : "-";
  }

  return JSON.stringify(value);
}

export function diffAuditFieldsStable(log: DetailAuditFeedItem) {
  const before = isRecord(log.before) ? log.before : {};
  const after = isRecord(log.after) ? log.after : {};
  const fieldLabels = log.fieldLabels ?? DEPOSIT_AUDIT_FIELD_LABELS;
  const keys = Object.keys({ ...before, ...after }).filter((key) => key in fieldLabels);

  return keys
    .map((key) => ({
      key,
      label: fieldLabels[key] ?? key,
      before: before[key],
      after: after[key],
      beforeLabel: formatAuditValueStable(before[key], log.valueFormatters?.[key]),
      afterLabel: formatAuditValueStable(after[key], log.valueFormatters?.[key]),
    }))
    .filter((row) => JSON.stringify(row.before) !== JSON.stringify(row.after));
}
