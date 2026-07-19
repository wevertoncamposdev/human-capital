"use client";

import { apiRequest, buildQuery } from "@/lib/api";
import type { AdvancedFilter } from "@/web-client/filtering/advanced-filters";
import { collectAndConditions } from "@/web-client/domain/conditions";
import type { Domain, DomainValue } from "@/web-client/domain/types";
import type {
  ActionPeopleParticipationInput,
  EndActionPeopleParticipationInput,
  ProjectActionPeopleParticipationsListResponse,
} from "./types";
import type { ProjectEnrollmentsListResponse } from "@/modules/projects/api";

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

function serializePeopleDomain(domain: Domain | null | undefined) {
  const conditions = collectAndConditions(domain ?? null);
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

export async function listProjectActionPeopleParticipations(
  token: string,
  projectId: string,
  actionId: string,
  params?: {
    q?: string;
    role?: string;
    page?: number;
    limit?: number;
  },
) {
  const query = buildQuery(params);
  return apiRequest<ProjectActionPeopleParticipationsListResponse>(
    `/projects/${projectId}/actions/${actionId}/people-participations${query}`,
    {},
    token,
  );
}

export async function createProjectActionPeopleParticipation(
  token: string,
  projectId: string,
  actionId: string,
  payload: ActionPeopleParticipationInput,
) {
  return apiRequest(
    `/projects/${projectId}/actions/${actionId}/people-participations`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function endProjectActionPeopleParticipation(
  token: string,
  projectId: string,
  actionId: string,
  participationId: string,
  payload?: EndActionPeopleParticipationInput,
) {
  return apiRequest<{ ok: true }>(
    `/projects/${projectId}/actions/${actionId}/people-participations/${participationId}/end`,
    { method: "PATCH", body: JSON.stringify(payload ?? {}) },
    token,
  );
}

export async function listEligibleProjectActionPeople(
  token: string,
  projectId: string,
  actionId: string,
  params?: {
    q?: string;
    filters?: Domain | null;
    participationKind?: "PARTICIPANT" | "TEAM";
    page?: number;
    limit?: number;
  },
) {
  const { filters, ...rest } = params ?? {};
  const query = buildQuery({
    ...rest,
    filters: serializePeopleDomain(filters),
  });
  return apiRequest<ProjectEnrollmentsListResponse>(
    `/projects/${projectId}/actions/${actionId}/eligible-people${query}`,
    {},
    token,
  );
}
