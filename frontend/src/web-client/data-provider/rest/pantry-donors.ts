"use client";

import type { ApiPantryDonor } from "@/modules/pantry/api";
import { listPantryDonors } from "@/modules/pantry/api";
import type { Domain, DomainCondition } from "@/web-client/domain/types";
import type { SearchArgs, SearchResult } from "@/web-client/data-provider/types";
import { collectAndConditions } from "@/web-client/data-provider/rest/domain-utils";

function normalizeString(value: unknown) {
  return String(value ?? "").trim();
}

function matchesText(value: unknown, needle: string) {
  const haystack = normalizeString(value).toLowerCase();
  return haystack.includes(needle);
}

function matchesStartsWith(value: unknown, needle: string) {
  const haystack = normalizeString(value).toLowerCase();
  return haystack.startsWith(needle);
}

function matchesEndsWith(value: unknown, needle: string) {
  const haystack = normalizeString(value).toLowerCase();
  return haystack.endsWith(needle);
}

function normalizeIsoDate(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const iso = trimmed.length >= 10 ? trimmed.slice(0, 10) : trimmed;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  return iso;
}

function listIncludes(value: string, list: unknown, invert = false) {
  if (!Array.isArray(list)) return true;
  const ok = list.some((v) => typeof v === "string" && v === value);
  return invert ? !ok : ok;
}

function matchesDonorCondition(row: ApiPantryDonor, condition: DomainCondition) {
  const { field, operator, value } = condition;

  switch (field) {
    case "name": {
      const name = normalizeString(row.name);
      if (operator === "=") return typeof value === "string" ? name === value : true;
      if (operator === "!=") return typeof value === "string" ? name !== value : true;
      if (operator === "contains" || operator === "ilike") {
        if (typeof value !== "string" || !value.trim()) return true;
        return matchesText(name, value.trim().toLowerCase());
      }
      if (operator === "starts_with") {
        if (typeof value !== "string" || !value.trim()) return true;
        return matchesStartsWith(name, value.trim().toLowerCase());
      }
      if (operator === "ends_with") {
        if (typeof value !== "string" || !value.trim()) return true;
        return matchesEndsWith(name, value.trim().toLowerCase());
      }
      if (operator === "in") return listIncludes(name, value, false);
      if (operator === "not_in") return listIncludes(name, value, true);
      if (operator === "is_null") return !name;
      if (operator === "not_null") return Boolean(name);
      return true;
    }
    case "type": {
      const type = normalizeString(row.type);
      if (operator === "=") return typeof value === "string" ? type === value : true;
      if (operator === "!=") return typeof value === "string" ? type !== value : true;
      if (operator === "in") return listIncludes(type, value, false);
      if (operator === "not_in") return listIncludes(type, value, true);
      if (operator === "is_null") return !type;
      if (operator === "not_null") return Boolean(type);
      return true;
    }
    case "contact": {
      const contact = normalizeString(row.contact);
      if (operator === "=") return typeof value === "string" ? contact === value : true;
      if (operator === "!=") return typeof value === "string" ? contact !== value : true;
      if (operator === "contains" || operator === "ilike") {
        if (typeof value !== "string" || !value.trim()) return true;
        return matchesText(contact, value.trim().toLowerCase());
      }
      if (operator === "starts_with") {
        if (typeof value !== "string" || !value.trim()) return true;
        return matchesStartsWith(contact, value.trim().toLowerCase());
      }
      if (operator === "ends_with") {
        if (typeof value !== "string" || !value.trim()) return true;
        return matchesEndsWith(contact, value.trim().toLowerCase());
      }
      if (operator === "in") return listIncludes(contact, value, false);
      if (operator === "not_in") return listIncludes(contact, value, true);
      if (operator === "is_null") return !contact;
      if (operator === "not_null") return Boolean(contact);
      return true;
    }
    case "createdAt":
    case "updatedAt": {
      const rowDate = normalizeIsoDate((row as Record<string, unknown>)[field]);
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
    default:
      return true;
  }
}

function resolveDonorQuery(domain: Domain) {
  const conditions = collectAndConditions(domain);
  if (!conditions) {
    throw new Error("Este endpoint ainda suporta apenas filtros combinados com AND.");
  }
  return conditions;
}

async function listAllDonors(token: string, searchText?: string) {
  const limit = 200;
  let page = 1;
  const all: ApiPantryDonor[] = [];

  for (;;) {
    const res = await listPantryDonors(token, {
      page,
      limit,
      q: searchText?.trim() ? searchText.trim() : undefined,
    });
    all.push(...(res.data ?? []));
    if (page >= (res.pagination?.pages ?? 1)) break;
    page += 1;
  }

  return all;
}

export async function searchPantryDonors(
  token: string,
  args: SearchArgs,
): Promise<SearchResult<ApiPantryDonor>> {
  const needle = args.searchText?.trim().toLowerCase() ?? "";
  const hasLocalFilters = Boolean(args.domain);

  if (!needle && !hasLocalFilters && !args.all) {
    const pageIndex = args.pagination?.pageIndex ?? 0;
    const pageSize = args.pagination?.pageSize ?? 50;
    const res = await listPantryDonors(token, { page: pageIndex + 1, limit: pageSize });
    return {
      data: res.data ?? [],
      pagination: res.pagination,
    };
  }

  const rows = await listAllDonors(token, needle || undefined);
  const conditions = resolveDonorQuery(args.domain ?? null);

  let filtered = rows;

  if (needle) {
    filtered = filtered.filter((row) => {
      const tokens = [row.name, row.type, row.contact ?? ""];
      return tokens.join(" ").toLowerCase().includes(needle);
    });
  }

  if (conditions.length) {
    filtered = filtered.filter((row) => conditions.every((cond) => matchesDonorCondition(row, cond)));
  }

  if (args.all) {
    return {
      data: filtered,
      pagination: {
        total: filtered.length,
        pages: 1,
        page: 1,
        limit: filtered.length,
      },
    };
  }

  const pageIndex = args.pagination?.pageIndex ?? 0;
  const pageSize = args.pagination?.pageSize ?? 50;

  const total = filtered.length;
  const pages = pageSize > 0 ? Math.ceil(total / pageSize) : total > 0 ? 1 : 0;

  const start = Math.max(pageIndex, 0) * Math.max(pageSize, 1);
  const data = pageSize > 0 ? filtered.slice(start, start + pageSize) : filtered;

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

