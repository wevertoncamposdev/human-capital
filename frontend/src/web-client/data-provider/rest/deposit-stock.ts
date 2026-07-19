"use client";

import { getDepositDashboard, type DepositDashboardResponse } from "@/modules/deposit/api";
import type { Domain, DomainCondition } from "@/web-client/domain/types";
import type { SearchArgs, SearchResult } from "@/web-client/data-provider/types";
import { collectAndConditions } from "@/web-client/data-provider/rest/domain-utils";

type StockRow = DepositDashboardResponse["stockRows"][number];

function normalizeIsoDate(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const iso = trimmed.length >= 10 ? trimmed.slice(0, 10) : trimmed;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  return iso;
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function matchesText(value: unknown, needle: string) {
  const haystack = String(value ?? "").trim().toLowerCase();
  return haystack.includes(needle);
}

function matchesStartsWith(value: unknown, needle: string) {
  const haystack = String(value ?? "").trim().toLowerCase();
  return haystack.startsWith(needle);
}

function matchesEndsWith(value: unknown, needle: string) {
  const haystack = String(value ?? "").trim().toLowerCase();
  return haystack.endsWith(needle);
}

function normalizeStringValue(value: unknown) {
  return String(value ?? "").trim();
}

function listIncludes(value: string, list: unknown, invert = false) {
  if (!Array.isArray(list)) return true;
  const ok = list.some((v) => typeof v === "string" && v === value);
  return invert ? !ok : ok;
}

function matchesStockCondition(row: StockRow, condition: DomainCondition) {
  const { field, operator, value } = condition;

  switch (field) {
    case "itemId": {
      if (operator === "=") return typeof value === "string" ? row.itemId === value : true;
      if (operator === "!=") return typeof value === "string" ? row.itemId !== value : true;
      if (operator === "in") return listIncludes(row.itemId, value, false);
      if (operator === "not_in") return listIncludes(row.itemId, value, true);
      if (operator === "is_null") return !row.itemId;
      if (operator === "not_null") return Boolean(row.itemId);
      return true;
    }
    case "sector": {
      const sectorValue = normalizeStringValue(row.sector);
      if (operator === "=") return typeof value === "string" ? sectorValue === value : true;
      if (operator === "!=") return typeof value === "string" ? sectorValue !== value : true;
      if (operator === "contains" || operator === "ilike") {
        if (typeof value !== "string" || !value.trim()) return true;
        return matchesText(sectorValue, value.trim().toLowerCase());
      }
      if (operator === "starts_with") {
        if (typeof value !== "string" || !value.trim()) return true;
        return matchesStartsWith(sectorValue, value.trim().toLowerCase());
      }
      if (operator === "ends_with") {
        if (typeof value !== "string" || !value.trim()) return true;
        return matchesEndsWith(sectorValue, value.trim().toLowerCase());
      }
      if (operator === "in") return listIncludes(sectorValue, value, false);
      if (operator === "not_in") return listIncludes(sectorValue, value, true);
      if (operator === "is_null") return !sectorValue;
      if (operator === "not_null") return Boolean(sectorValue);
      return true;
    }
    case "group": {
      const groupValue = normalizeStringValue(row.group ?? "");
      if (operator === "=") return typeof value === "string" ? groupValue === value : true;
      if (operator === "!=") return typeof value === "string" ? groupValue !== value : true;
      if (operator === "contains" || operator === "ilike") {
        if (typeof value !== "string" || !value.trim()) return true;
        return matchesText(groupValue, value.trim().toLowerCase());
      }
      if (operator === "starts_with") {
        if (typeof value !== "string" || !value.trim()) return true;
        return matchesStartsWith(groupValue, value.trim().toLowerCase());
      }
      if (operator === "ends_with") {
        if (typeof value !== "string" || !value.trim()) return true;
        return matchesEndsWith(groupValue, value.trim().toLowerCase());
      }
      if (operator === "in") return listIncludes(groupValue, value, false);
      if (operator === "not_in") return listIncludes(groupValue, value, true);
      if (operator === "is_null") return !groupValue;
      if (operator === "not_null") return Boolean(groupValue);
      return true;
    }
    case "validityStatus": {
      const status = normalizeStringValue(row.validityStatus);
      if (operator === "=") return typeof value === "string" ? status === value : true;
      if (operator === "!=") return typeof value === "string" ? status !== value : true;
      if (operator === "in") return listIncludes(status, value, false);
      if (operator === "not_in") return listIncludes(status, value, true);
      if (operator === "is_null") return !status;
      if (operator === "not_null") return Boolean(status);
      return true;
    }
    case "isBelowMin": {
      if (operator === "is_null") return row.isBelowMin === null || row.isBelowMin === undefined;
      if (operator === "not_null") return row.isBelowMin !== null && row.isBelowMin !== undefined;
      if (operator !== "=" && operator !== "!=" && operator !== "in" && operator !== "not_in")
        return true;
      const actual = row.isBelowMin;
      if (operator === "in" || operator === "not_in") {
        if (!Array.isArray(value)) return true;
        const list = value
          .map((v) => {
            if (v === true || v === false) return v;
            if (typeof v === "string") {
              if (v === "true") return true;
              if (v === "false") return false;
            }
            return null;
          })
          .filter((v): v is boolean => v !== null);
        if (!list.length) return true;
        const ok = list.includes(Boolean(actual));
        return operator === "not_in" ? !ok : ok;
      }
      if (value === true || value === false) {
        return operator === "!=" ? actual !== value : actual === value;
      }
      if (typeof value === "string") {
        if (value === "true") return operator === "!=" ? actual !== true : actual === true;
        if (value === "false") return operator === "!=" ? actual !== false : actual === false;
      }
      return true;
    }
    case "nextExpiryDate": {
      const rowDate = normalizeIsoDate(row.nextExpiryDate);
      if (operator === "is_null") return !rowDate;
      if (operator === "not_null") return Boolean(rowDate);
      if (operator === "=") {
        const target = normalizeIsoDate(value);
        if (!target) return true;
        return rowDate === target;
      }
      if (operator === "!=") {
        const target = normalizeIsoDate(value);
        if (!target) return true;
        return rowDate !== target;
      }
      if (operator === ">=") {
        const target = normalizeIsoDate(value);
        if (!target) return true;
        if (!rowDate) return false;
        return rowDate >= target;
      }
      if (operator === "<=") {
        const target = normalizeIsoDate(value);
        if (!target) return true;
        if (!rowDate) return false;
        return rowDate <= target;
      }
      if (operator === "between") {
        if (!Array.isArray(value)) return true;
        const [fromRaw, toRaw] = value;
        const from = normalizeIsoDate(fromRaw);
        const to = normalizeIsoDate(toRaw);
        if (!from || !to) return true;
        if (!rowDate) return false;
        return rowDate >= from && rowDate <= to;
      }
      return true;
    }
    case "sectorStock":
    case "itemStock":
    case "minStock": {
      const actual =
        field === "sectorStock" ? row.sectorStock : field === "itemStock" ? row.itemStock : row.minStock;
      if (operator === "is_null") return actual === null || actual === undefined;
      if (operator === "not_null") return actual !== null && actual !== undefined;
      const target = toNumber(value);
      if (target === null) return true;
      if (operator === "=") return actual === target;
      if (operator === ">=") return actual >= target;
      if (operator === "<=") return actual <= target;
      if (operator === ">") return actual > target;
      if (operator === "<") return actual < target;
      if (operator === "in") {
        if (!Array.isArray(value)) return true;
        const list = value.map((v) => toNumber(v)).filter((v): v is number => v !== null);
        if (!list.length) return true;
        return list.includes(actual);
      }
      if (operator === "not_in") {
        if (!Array.isArray(value)) return true;
        const list = value.map((v) => toNumber(v)).filter((v): v is number => v !== null);
        if (!list.length) return true;
        return !list.includes(actual);
      }
      return true;
    }
    default:
      return true;
  }
}

function resolveStockQuery(domain: Domain) {
  const conditions = collectAndConditions(domain);
  if (!conditions) {
    throw new Error("Este endpoint ainda suporta apenas filtros combinados com AND.");
  }
  return conditions;
}

export async function searchDepositStock(
  token: string,
  args: SearchArgs,
): Promise<SearchResult<StockRow>> {
  const dashboard = await getDepositDashboard(token);
  const conditions = resolveStockQuery(args.domain ?? null);

  const needle = args.searchText?.trim().toLowerCase() ?? "";

  let rows = dashboard.stockRows.slice();

  if (needle) {
    rows = rows.filter((row) => {
      const tokens = [
        row.name,
        row.group ?? "",
        row.sector,
        row.unit,
        row.validityStatus,
        row.nextExpiryDate ?? "",
        String(row.sectorStock),
        String(row.itemStock),
        String(row.minStock),
        row.isBelowMin ? "abaixo do minimo" : "ok",
      ];

      return tokens.join(" ").toLowerCase().includes(needle);
    });
  }

  if (conditions.length) {
    rows = rows.filter((row) => conditions.every((cond) => matchesStockCondition(row, cond)));
  }

  if (args.all) {
    return {
      data: rows,
      pagination: {
        total: rows.length,
        pages: 1,
        page: 1,
        limit: rows.length,
      },
    };
  }

  const pageIndex = args.pagination?.pageIndex ?? 0;
  const pageSize = args.pagination?.pageSize ?? 100;

  const total = rows.length;
  const pages = pageSize > 0 ? Math.ceil(total / pageSize) : total > 0 ? 1 : 0;

  const start = Math.max(pageIndex, 0) * Math.max(pageSize, 1);
  const data = pageSize > 0 ? rows.slice(start, start + pageSize) : rows;

  return {
    data,
    pagination: {
      total,
      pages,
      page: Math.max(pageIndex, 0) + 1,
      limit: pageSize,
    },
  };
}

