import { apiRequest, buildQuery } from "@/lib/api";
import type {
  ApiProjectEnrollment,
  ApiProjectGroup,
  ApiProjectPeopleGroup,
  EligibleProjectPeopleListResponse,
  ProjectGroupsListResponse,
  EnrollmentGroupInput,
  ProjectEnrollmentInput,
  ProjectEnrollmentsListResponse,
  ProjectGroupInput,
  ProjectPeopleGroupInput,
} from "./types";
import type { AdvancedFilter } from "@/web-client/filtering/advanced-filters";
import { collectAndConditions } from "@/web-client/domain/conditions";
import type { Domain, DomainValue } from "@/web-client/domain/types";

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

export async function listProjectGroups(token: string, projectId: string) {
  return apiRequest<ApiProjectGroup[]>(
    `/projects/${projectId}/groups`,
    {},
    token,
  );
}

export async function listProjectPeopleGroups(
  token: string,
  projectId: string,
  params?: { participationKind?: "PARTICIPANT" | "TEAM" },
) {
  const query = buildQuery(params);
  return apiRequest<ApiProjectPeopleGroup[]>(`/projects/${projectId}/people-groups${query}`, {}, token);
}

export async function createProjectPeopleGroup(
  token: string,
  projectId: string,
  payload: ProjectPeopleGroupInput,
) {
  return apiRequest<ApiProjectPeopleGroup>(
    `/projects/${projectId}/people-groups`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function deleteProjectPeopleGroup(
  token: string,
  projectId: string,
  projectPeopleGroupId: string,
) {
  return apiRequest<{ ok: true }>(
    `/projects/${projectId}/people-groups/${projectPeopleGroupId}`,
    { method: "DELETE" },
    token,
  );
}

export async function listAllProjectGroups(
  token: string,
  params?: { q?: string; page?: number; limit?: number; all?: boolean },
) {
  const query = buildQuery(params);
  return apiRequest<ProjectGroupsListResponse>(`/project-groups${query}`, {}, token);
}

export async function createProjectGroup(
  token: string,
  projectId: string,
  payload: ProjectGroupInput,
) {
  return apiRequest<ApiProjectGroup>(
    `/projects/${projectId}/groups`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function updateProjectGroup(
  token: string,
  projectId: string,
  groupId: string,
  payload: Partial<ProjectGroupInput>,
) {
  return apiRequest<ApiProjectGroup>(
    `/projects/${projectId}/groups/${groupId}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token,
  );
}

export async function deleteProjectGroup(
  token: string,
  projectId: string,
  groupId: string,
) {
  return apiRequest<{ ok: true }>(
    `/projects/${projectId}/groups/${groupId}`,
    { method: "DELETE" },
    token,
  );
}

export async function listProjectEnrollments(
  token: string,
  projectId: string,
  params?: {
    q?: string;
    status?: string;
    groupId?: string;
    groupHistoryId?: string;
    peopleGroupId?: string;
    excludeGroupId?: string;
    excludePeopleGroupId?: string;
    filters?: Domain | null;
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
    `/projects/${projectId}/enrollments${query}`,
    {},
    token,
  );
}

export async function listEligibleProjectPeople(
  token: string,
  projectId: string,
  params?: {
    q?: string;
    peopleGroupId?: string;
    filters?: Domain | null;
    page?: number;
    limit?: number;
  },
) {
  const { filters, ...rest } = params ?? {};
  return apiRequest<EligibleProjectPeopleListResponse>(
    `/projects/${projectId}/eligible-people${buildQuery({
      ...rest,
      filters: serializePeopleDomain(filters),
    })}`,
    {},
    token,
  );
}

export async function createProjectEnrollment(
  token: string,
  projectId: string,
  payload: ProjectEnrollmentInput,
) {
  return apiRequest<ApiProjectEnrollment>(
    `/projects/${projectId}/enrollments`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function updateProjectEnrollment(
  token: string,
  projectId: string,
  enrollmentId: string,
  payload: Partial<ProjectEnrollmentInput>,
) {
  return apiRequest<ApiProjectEnrollment>(
    `/projects/${projectId}/enrollments/${enrollmentId}`,
    { method: "PATCH", body: JSON.stringify(payload) },
    token,
  );
}

export async function deleteProjectEnrollment(
  token: string,
  projectId: string,
  enrollmentId: string,
) {
  return apiRequest<{ ok: true }>(
    `/projects/${projectId}/enrollments/${enrollmentId}`,
    { method: "DELETE" },
    token,
  );
}

export async function addEnrollmentToGroup(
  token: string,
  projectId: string,
  enrollmentId: string,
  payload: EnrollmentGroupInput,
) {
  return apiRequest<{ ok: true }>(
    `/projects/${projectId}/enrollments/${enrollmentId}/groups`,
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

export async function removeEnrollmentFromGroup(
  token: string,
  projectId: string,
  enrollmentId: string,
  groupId: string,
) {
  return apiRequest<{ ok: true }>(
    `/projects/${projectId}/enrollments/${enrollmentId}/groups/${groupId}`,
    { method: "DELETE" },
    token,
  );
}
