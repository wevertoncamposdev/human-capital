"use client";

import { listDepositHistory, type ApiDepositHistoryMovement } from "@/modules/deposit/api";
import type { Domain } from "@/web-client/domain/types";
import type { SearchArgs, SearchResult } from "@/web-client/data-provider/types";
import { collectAndConditions } from "@/web-client/data-provider/rest/domain-utils";

type DepositHistoryExitType =
  | "LOAN"
  | "FINAL_REMOVAL"
  | "TRANSFER"
  | "ADJUSTMENT"
  | "LOSS";

function resolveHistoryQuery(domain: Domain) {
  const conditions = collectAndConditions(domain);
  if (!conditions) return {};

  const params: {
    kind?: "ALL" | "ENTRY" | "EXIT";
    from?: string;
    to?: string;
    type?: DepositHistoryExitType;
    destinationName?: string;
    itemId?: string;
  } = {};

  conditions.forEach((condition) => {
    const value = condition.value;
    switch (condition.field) {
      case "kind":
        if (condition.operator === "=" && (value === "ENTRY" || value === "EXIT")) {
          params.kind = value;
        }
        break;
      case "movementDate":
        if (condition.operator === "between" && Array.isArray(value)) {
          const [from, to] = value;
          if (typeof from === "string" && from) params.from = from;
          if (typeof to === "string" && to) params.to = to;
        } else if (condition.operator === ">=" && typeof value === "string") {
          params.from = value;
        } else if (condition.operator === "<=" && typeof value === "string") {
          params.to = value;
        } else if (condition.operator === "=" && typeof value === "string") {
          params.from = value;
          params.to = value;
        }
        break;
      case "type":
        if (
          condition.operator === "=" &&
          (value === "LOAN" ||
            value === "FINAL_REMOVAL" ||
            value === "TRANSFER" ||
            value === "ADJUSTMENT" ||
            value === "LOSS")
        ) {
          params.type = value;
        }
        break;
      case "destinationName":
        if (
          (condition.operator === "contains" ||
            condition.operator === "ilike" ||
            condition.operator === "=") &&
          typeof value === "string"
        ) {
          params.destinationName = value;
        }
        break;
      case "itemId":
        if (condition.operator === "=" && typeof value === "string") {
          params.itemId = value;
        }
        break;
      default:
        break;
    }
  });

  return params;
}

function normalizeIsoDateOnly(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const iso = trimmed.length >= 10 ? trimmed.slice(0, 10) : trimmed;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  return iso;
}

function normalizeString(value: unknown) {
  return String(value ?? "").trim();
}

function foldText(value: unknown) {
  return normalizeString(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function includesText(haystack: unknown, needle: string) {
  const normalizedHay = foldText(haystack);
  if (!normalizedHay) return false;
  return normalizedHay.includes(foldText(needle));
}

function startsWithText(haystack: unknown, needle: string) {
  const normalizedHay = foldText(haystack);
  if (!normalizedHay) return false;
  return normalizedHay.startsWith(foldText(needle));
}

function endsWithText(haystack: unknown, needle: string) {
  const normalizedHay = foldText(haystack);
  if (!normalizedHay) return false;
  return normalizedHay.endsWith(foldText(needle));
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function resolveFieldValue(row: ApiDepositHistoryMovement, field: string) {
  switch (field) {
    case "kind":
      return row.kind;
    case "movementDate":
      return normalizeIsoDateOnly(row.movementDate);
    case "createdAt":
      return normalizeIsoDateOnly(row.createdAt);
    case "itemId":
      return row.itemId;
    case "itemName":
      return row.item?.name ?? "";
    case "itemGroup":
      return row.item?.group ?? "";
    case "sector":
      return row.sector;
    case "quantity":
      return row.quantity;
    case "unit":
      return row.unit;
    case "notes":
      return row.notes ?? "";
    case "expiryDate":
      return normalizeIsoDateOnly(row.expiryDate);
    case "donorName":
      return row.donorName ?? "";
    case "type":
      return row.type ?? "";
    case "destinationName":
      return row.destinationName ?? "";
    case "actor":
      return row.actor ?? "";
    default:
      return (row as Record<string, unknown>)[field];
  }
}

function listIncludes(actual: unknown, list: unknown, invert = false) {
  if (!Array.isArray(list)) return true;
  const actualText = foldText(actual);
  const ok = list.some((v) => foldText(v) === actualText);
  return invert ? !ok : ok;
}

function matchesCondition(
  row: ApiDepositHistoryMovement,
  condition: { field: string; operator: string; value?: unknown },
) {
  const { field, operator, value } = condition;
  const actual = resolveFieldValue(row, field);

  if (operator === "is_null") {
    const text = normalizeString(actual);
    return actual === null || actual === undefined || text === "";
  }
  if (operator === "not_null") {
    const text = normalizeString(actual);
    return !(actual === null || actual === undefined || text === "");
  }

  if (operator === "in") return listIncludes(actual, value, false);
  if (operator === "not_in") return listIncludes(actual, value, true);

  if (operator === "contains" || operator === "ilike") {
    const needle = foldText(value);
    if (!needle) return true;
    return includesText(actual, needle);
  }
  if (operator === "starts_with") {
    const needle = foldText(value);
    if (!needle) return true;
    return startsWithText(actual, needle);
  }
  if (operator === "ends_with") {
    const needle = foldText(value);
    if (!needle) return true;
    return endsWithText(actual, needle);
  }

  if (operator === "between") {
    if (!Array.isArray(value)) return true;
    const [fromRaw, toRaw] = value;

    const actualDate = normalizeIsoDateOnly(actual);
    const fromDate = normalizeIsoDateOnly(fromRaw);
    const toDate = normalizeIsoDateOnly(toRaw);
    if (actualDate && (fromDate || toDate)) {
      if (fromDate && actualDate < fromDate) return false;
      if (toDate && actualDate > toDate) return false;
      return true;
    }

    const actualNum = toNumber(actual);
    const fromNum = toNumber(fromRaw);
    const toNum = toNumber(toRaw);
    if (actualNum !== null && (fromNum !== null || toNum !== null)) {
      if (fromNum !== null && actualNum < fromNum) return false;
      if (toNum !== null && actualNum > toNum) return false;
      return true;
    }

    return true;
  }

  if (operator === "=" || operator === "!=") {
    const actualText = foldText(actual);
    const targetText = foldText(value);
    const ok = actualText === targetText;
    return operator === "!=" ? !ok : ok;
  }

  if (operator === ">=" || operator === "<=" || operator === ">" || operator === "<") {
    const actualDate = normalizeIsoDateOnly(actual);
    const targetDate = normalizeIsoDateOnly(value);
    if (actualDate && targetDate) {
      if (operator === ">=") return actualDate >= targetDate;
      if (operator === "<=") return actualDate <= targetDate;
      if (operator === ">") return actualDate > targetDate;
      if (operator === "<") return actualDate < targetDate;
    }

    const actualNum = toNumber(actual);
    const targetNum = toNumber(value);
    if (actualNum === null || targetNum === null) return true;
    if (operator === ">=") return actualNum >= targetNum;
    if (operator === "<=") return actualNum <= targetNum;
    if (operator === ">") return actualNum > targetNum;
    if (operator === "<") return actualNum < targetNum;
  }

  return true;
}

function matchesDomain(row: ApiDepositHistoryMovement, domain: Domain): boolean {
  if (!domain) return true;
  if (domain.type === "condition") return matchesCondition(row, domain);
  if (domain.type === "not") return !matchesDomain(row, domain.child);
  if (domain.type === "group") {
    if (domain.combinator === "and") {
      return domain.children.every((child) => matchesDomain(row, child));
    }
    return domain.children.some((child) => matchesDomain(row, child));
  }
  return true;
}

function matchesSearch(row: ApiDepositHistoryMovement, searchText: string) {
  const needle = foldText(searchText);
  if (!needle) return true;

  const kindLabel = row.kind === "ENTRY" ? "entrada" : "saida";
  const parts = [
    row.item?.name,
    row.item?.group,
    row.sector,
    kindLabel,
    row.type,
    row.destinationName,
    row.donorName,
    row.notes,
    row.actor,
    normalizeIsoDateOnly(row.movementDate),
    normalizeIsoDateOnly(row.expiryDate),
    row.unit,
    String(row.quantity),
  ];

  return parts.some((value) => includesText(value, needle));
}

export async function searchDepositHistory(
  token: string,
  args: SearchArgs,
): Promise<SearchResult<ApiDepositHistoryMovement>> {
  const queryParams = resolveHistoryQuery(args.domain ?? null);

  const pageIndex = args.pagination?.pageIndex ?? 0;
  const pageSize = args.pagination?.pageSize ?? 100;
  const shouldFetchAll = Boolean(args.all);

  const hasDomain = Boolean(args.domain);
  const hasSearchText = Boolean(args.searchText?.trim());
  const needsLocalFiltering = hasDomain || hasSearchText;

  if (!needsLocalFiltering) {
    return listDepositHistory(token, {
      kind: queryParams.kind,
      from: queryParams.from,
      to: queryParams.to,
      type: queryParams.type,
      destinationName: queryParams.destinationName,
      itemId: queryParams.itemId,
      search: undefined,
      page: shouldFetchAll ? undefined : pageIndex + 1,
      limit: shouldFetchAll ? undefined : pageSize,
      all: shouldFetchAll ? true : undefined,
    });
  }

  const response = await listDepositHistory(token, {
    kind: queryParams.kind,
    from: queryParams.from,
    to: queryParams.to,
    type: queryParams.type,
    destinationName: queryParams.destinationName,
    itemId: queryParams.itemId,
    page: undefined,
    limit: undefined,
    all: true,
  });

  let data = response.data;
  if (args.domain) {
    data = data.filter((row) => matchesDomain(row, args.domain ?? null));
  }
  if (args.searchText?.trim()) {
    data = data.filter((row) => matchesSearch(row, args.searchText ?? ""));
  }

  if (shouldFetchAll || !args.pagination) {
    const limit = data.length || response.pagination.limit || 1;
    return {
      data,
      pagination: {
        page: 1,
        limit,
        total: data.length,
        pages: data.length ? 1 : 0,
      },
    };
  }

  const total = data.length;
  const pages = total ? Math.ceil(total / pageSize) : 0;
  const start = Math.max(0, pageIndex) * pageSize;
  const sliced = data.slice(start, start + pageSize);

  return {
    data: sliced,
    pagination: {
      page: Math.min(pageIndex + 1, Math.max(pages, 1)),
      limit: pageSize,
      total,
      pages,
    },
  };
}
