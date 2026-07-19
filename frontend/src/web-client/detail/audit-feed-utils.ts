"use client";

import {
  formatDateOnlyPtBR,
  formatDateTimePtBR,
  todayLocalIsoDate,
} from "@/lib/date";
import type { DetailAuditFeedItem } from "@/web-client/detail/audit-types";

export type AuditDiffRow = {
  key: string;
  label: string;
  before: unknown;
  after: unknown;
  beforeLabel: string;
  afterLabel: string;
};

export type GroupedAuditRow = AuditDiffRow & {
  sourceLabel: string;
};

export type GroupedAuditFeedItem = {
  id: string;
  action: DetailAuditFeedItem["action"];
  createdAt: string;
  minuteKey: string;
  userKey: string;
  logs: DetailAuditFeedItem[];
  sourceLabels: string[];
  rows: GroupedAuditRow[];
};

export type GroupedAuditDaySection = {
  key: string;
  label: string;
  items: GroupedAuditFeedItem[];
};

export type AuditHistoryItem = {
  id: string;
  title: string;
  description?: string | null;
  meta?: string | null;
  createdAt: string;
};

export type AuditChangedFieldsSummary = {
  labels: string[];
  hiddenCount: number;
};

const AVATAR_PALETTE = [
  { bg: "bg-sky-500/15", text: "text-sky-700 dark:text-sky-200" },
  { bg: "bg-violet-500/15", text: "text-violet-700 dark:text-violet-200" },
  { bg: "bg-emerald-500/15", text: "text-emerald-700 dark:text-emerald-200" },
  { bg: "bg-amber-500/15", text: "text-amber-800 dark:text-amber-200" },
  { bg: "bg-rose-500/15", text: "text-rose-700 dark:text-rose-200" },
  { bg: "bg-teal-500/15", text: "text-teal-700 dark:text-teal-200" },
] as const;

const HTML_TAG_PATTERN = /<[^>]+>/g;
const HTML_TAG_TEST_PATTERN = /<[^>]+>/;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
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

export function initialsFromLabel(label: string) {
  const cleaned = label.replace(/\s+/g, " ").trim().slice(0, 64);
  if (!cleaned) return "?";
  const parts = cleaned.split(" ").filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return `${first}${last}`.toUpperCase();
}

export function pickAvatarPalette(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0;
  }
  const paletteIndex = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[paletteIndex]!;
}

function isDateOnlyValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isDateTimeValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}T/.test(value);
}

function isMeaningfulAuditFormatterValue(formatted: string, value: unknown) {
  if (!formatted) return false;
  if (value === null || value === undefined) return true;
  return formatted !== "-" && formatted !== "—";
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

export function formatAuditValueStable(
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
    return "—";
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return "—";
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
    return Number.isFinite(value) ? value.toLocaleString("pt-BR") : "—";
  }

  if (typeof value === "boolean") {
    return value ? "Sim" : "Nao";
  }

  if (Array.isArray(value)) {
    return value.length
      ? value.map((item) => formatAuditValueStable(item)).join(", ")
      : "—";
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function diffAuditFieldsStable(log: DetailAuditFeedItem): AuditDiffRow[] {
  const before = isRecord(log.before) ? log.before : {};
  const after = isRecord(log.after) ? log.after : {};
  const fieldLabels = log.fieldLabels ?? {};
  const allKeys = Object.keys({ ...before, ...after });
  const keys = Object.keys(fieldLabels).length
    ? allKeys.filter((key) => key in fieldLabels)
    : allKeys;

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

export function resolveAuditTone(action: DetailAuditFeedItem["action"]) {
  switch (action) {
    case "CREATE":
      return {
        dotClass: "bg-emerald-500",
        badgeClass:
          "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-200",
      };
    case "DELETE":
      return {
        dotClass: "bg-rose-500",
        badgeClass:
          "border-transparent bg-rose-500/15 text-rose-700 dark:text-rose-200",
      };
    default:
      return {
        dotClass: "bg-sky-500",
        badgeClass:
          "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-200",
      };
  }
}

export function resolveAuditSummary(log: DetailAuditFeedItem) {
  if (log.action === "CREATE") {
    return "Registro criado.";
  }

  if (log.action === "DELETE") {
    return "Registro removido.";
  }

  return "Sem alteracoes detalhadas.";
}

export function sanitizeAuditLabel(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "—" || trimmed === "-") {
    return "-";
  }
  return trimmed;
}

function resolveAuditMinuteKey(createdAt: string) {
  return createdAt.slice(0, 16);
}

function resolveAuditDayKey(createdAt: string) {
  return createdAt.slice(0, 10);
}

function resolveAuditUserKey(log: DetailAuditFeedItem) {
  return log.userId ?? log.user?.email ?? log.user?.name ?? "system";
}

function normalizeAuditSourceLabel(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function defaultAuditSourcePriority(value: string) {
  const normalized = normalizeAuditSourceLabel(value);
  if (normalized.includes("item")) return 0;
  if (normalized.includes("entrada")) return 1;
  if (normalized.includes("saida")) return 2;
  if (normalized.includes("pessoa") || normalized.includes("person")) return 3;
  return 99;
}

export function sortAuditSourceLabels(
  labels: string[],
  getSourcePriority: (value: string) => number = defaultAuditSourcePriority,
) {
  return [...labels].sort((left, right) => {
    const leftPriority = getSourcePriority(left);
    const rightPriority = getSourcePriority(right);

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return left.localeCompare(right);
  });
}

function mergeGroupedRows(
  currentRows: GroupedAuditRow[],
  nextRows: AuditDiffRow[],
  sourceLabel: string,
) {
  const merged = [...currentRows];

  nextRows.forEach((row) => {
    const rowIndex = merged.findIndex(
      (existing) => existing.key === row.key && existing.sourceLabel === sourceLabel,
    );

    if (rowIndex === -1) {
      merged.push({ ...row, sourceLabel });
      return;
    }

    merged[rowIndex] = {
      ...merged[rowIndex],
      after: row.after,
      afterLabel: row.afterLabel,
    };
  });

  return merged;
}

export function buildGroupedAuditFeed(
  logs: DetailAuditFeedItem[],
  options?: {
    getSourcePriority?: (value: string) => number;
  },
) {
  const getSourcePriority = options?.getSourcePriority ?? defaultAuditSourcePriority;

  return logs.reduce<GroupedAuditFeedItem[]>((groups, log) => {
    const nextRows = log.action === "UPDATE" ? diffAuditFieldsStable(log) : [];
    const minuteKey = resolveAuditMinuteKey(log.createdAt);
    const userKey = resolveAuditUserKey(log);
    const previousGroup = groups[groups.length - 1];

    if (
      previousGroup &&
      log.action === "UPDATE" &&
      previousGroup.action === "UPDATE" &&
      previousGroup.minuteKey === minuteKey &&
      previousGroup.userKey === userKey
    ) {
      previousGroup.logs.push(log);
      previousGroup.rows = mergeGroupedRows(
        previousGroup.rows,
        nextRows,
        log.sourceLabel,
      );
      if (!previousGroup.sourceLabels.includes(log.sourceLabel)) {
        previousGroup.sourceLabels = sortAuditSourceLabels(
          [...previousGroup.sourceLabels, log.sourceLabel],
          getSourcePriority,
        );
      }
      return groups;
    }

    groups.push({
      id: log.id,
      action: log.action,
      createdAt: log.createdAt,
      minuteKey,
      userKey,
      logs: [log],
      sourceLabels: sortAuditSourceLabels([log.sourceLabel], getSourcePriority),
      rows: mergeGroupedRows([], nextRows, log.sourceLabel),
    });

    return groups;
  }, []);
}

export function buildAuditDaySections(groups: GroupedAuditFeedItem[]) {
  const today = todayLocalIsoDate();

  return groups.reduce<GroupedAuditDaySection[]>((sections, group) => {
    const dayKey = resolveAuditDayKey(group.createdAt);
    const previousSection = sections[sections.length - 1];

    if (previousSection?.key === dayKey) {
      previousSection.items.push(group);
      return sections;
    }

    sections.push({
      key: dayKey,
      label: dayKey === today ? "Hoje" : formatDateOnlyPtBR(dayKey),
      items: [group],
    });

    return sections;
  }, []);
}

export function resolveAuditChangedFieldsSummary(
  rows: GroupedAuditRow[],
  limit = 4,
): AuditChangedFieldsSummary {
  const uniqueLabels = Array.from(
    new Set(rows.map((row) => row.label.trim()).filter(Boolean)),
  );

  return {
    labels: uniqueLabels.slice(0, limit),
    hiddenCount: Math.max(uniqueLabels.length - limit, 0),
  };
}

export function resolveGroupedAuditHeadline(group: GroupedAuditFeedItem) {
  if (group.action === "CREATE") {
    return `${group.sourceLabels[0] ?? "Registro"} criado`;
  }

  if (group.action === "DELETE") {
    return `${group.sourceLabels[0] ?? "Registro"} removido`;
  }

  if (group.rows.length === 1) {
    return `${group.rows[0]?.label ?? "Campo"} alterado`;
  }

  if (group.rows.length > 1) {
    return `${group.rows.length} campos alterados`;
  }

  return `${group.sourceLabels[0] ?? "Registro"} atualizado`;
}

export function buildAuditHistoryItems(
  logs: DetailAuditFeedItem[],
): AuditHistoryItem[] {
  return buildGroupedAuditFeed(logs).map((group) => ({
    id: group.id,
    title: resolveGroupedAuditHeadline(group),
    description: group.sourceLabels.join(", "),
    meta: resolveAuditActionLabel(group.action),
    createdAt: group.createdAt,
  }));
}

export function isAuditRichTextValue(value: unknown) {
  return typeof value === "string" && HTML_TAG_TEST_PATTERN.test(value);
}

export function normalizeAuditDialogValue(
  rawValue: unknown,
  formattedValue: string,
) {
  const sanitized = sanitizeAuditLabel(formattedValue);
  const fallback = sanitized === "-" ? "Sem valor" : sanitized;

  if (rawValue === null || rawValue === undefined) {
    return "Sem valor";
  }

  if (typeof rawValue === "string") {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      return "Sem valor";
    }

    if (isAuditRichTextValue(trimmed)) {
      const plainText = trimmed
        .replace(HTML_TAG_PATTERN, " ")
        .replace(/\s+/g, " ")
        .trim();

      return plainText || fallback;
    }

    return fallback;
  }

  if (Array.isArray(rawValue) || isRecord(rawValue)) {
    if (fallback !== "Sem valor") {
      return fallback;
    }

    try {
      return JSON.stringify(rawValue, null, 2);
    } catch {
      return String(rawValue);
    }
  }

  return fallback;
}
