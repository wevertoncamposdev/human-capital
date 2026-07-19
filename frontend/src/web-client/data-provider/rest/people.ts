"use client";

import type { AdvancedFilter } from "@/web-client/filtering/advanced-filters";
import { collectAndConditions } from "@/web-client/domain/conditions";
import type { Domain, DomainValue } from "@/web-client/domain/types";
import type { SearchArgs, SearchResult } from "@/web-client/data-provider/types";
import {
  createPerson,
  deletePerson,
  getPerson,
  listPeople,
  updatePerson,
  type ApiPerson,
} from "@/modules/people/api";
import type { PersonInput } from "@/modules/people/api/types";

function toFilterValue(value: DomainValue | undefined) {
  if (value === undefined || value === null) return "";
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "")).join(",");
  }
  return String(value);
}

function mapDomainOperatorToAdvancedFilter(
  operator: string,
): AdvancedFilter["operator"] | null {
  switch (operator) {
    case "=":
      return "equals";
    case "contains":
    case "ilike":
      return "contains";
    case "in":
      return "in";
    case "not_in":
      return "notIn";
    case "is_null":
      return "isEmpty";
    case "not_null":
      return "isNotEmpty";
    case "between":
      return "between";
    case ">":
      return "gt";
    case ">=":
      return "gte";
    case "<":
      return "lt";
    case "<=":
      return "lte";
    case "starts_with":
      return "starts";
    case "ends_with":
      return "ends";
    default:
      return null;
  }
}

function serializePeopleDomain(domain: Domain) {
  const conditions = collectAndConditions(domain);
  if (!conditions?.length) return undefined;

  const filters = conditions
    .map<AdvancedFilter | null>((condition) => {
      const operator = mapDomainOperatorToAdvancedFilter(condition.operator);
      if (!operator) return null;

      const value =
        operator === "between" && Array.isArray(condition.value)
          ? condition.value.map((item) => String(item ?? "")).join("..")
          : toFilterValue(condition.value);

      return {
        columnId: condition.field,
        operator,
        value,
      };
    })
    .filter(Boolean) as AdvancedFilter[];

  return filters.length ? JSON.stringify(filters) : undefined;
}

export async function searchPeople(
  token: string,
  args: SearchArgs,
): Promise<SearchResult<ApiPerson>> {
  const response = await listPeople(token, {
    q: args.searchText?.trim() || undefined,
    page: args.all ? undefined : (args.pagination?.pageIndex ?? 0) + 1,
    limit: args.all ? undefined : args.pagination?.pageSize,
    all: args.all ? true : undefined,
    filters: serializePeopleDomain(args.domain ?? null),
    groupBy: args.groupBy?.length ? JSON.stringify(args.groupBy) : undefined,
  });

  return {
    data: response.data,
    pagination: response.pagination,
  };
}

export async function readPerson(token: string, id: string) {
  return getPerson(token, id);
}

export async function createPersonRecord(token: string, payload: PersonInput) {
  return createPerson(token, payload);
}

export async function updatePersonRecord(
  token: string,
  id: string,
  payload: PersonInput,
) {
  return updatePerson(token, id, payload);
}

export async function deletePersonRecord(token: string, id: string) {
  return deletePerson(token, id);
}
