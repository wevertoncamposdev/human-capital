"use client";

import { apiRequest, buildQuery } from "@/lib/api";
import type { AdvancedFilter } from "@/web-client/filtering/advanced-filters";
import type {
  TaskAssignableUser,
  TaskAttachmentMutationInput,
  TaskChecklistItemMutationInput,
  TaskCommentMutationInput,
  TaskMutationInput,
  TaskRecord,
  TaskSubtaskMutationInput,
} from "@/modules/tasks/shared/domain/types";
import { collectAndConditions } from "@/web-client/domain/conditions";
import type { Domain, DomainValue } from "@/web-client/domain/types";
import type { SearchArgs, SearchResult } from "@/web-client/data-provider/types";
import type { DetailAuditLogListResponse } from "@/web-client/detail/audit-types";

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

function serializeTasksDomain(domain: Domain) {
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

export async function searchTasks(
  token: string,
  args: SearchArgs,
): Promise<SearchResult<TaskRecord>> {
  const query = buildQuery({
    q: args.searchText?.trim() || undefined,
    page: args.all ? undefined : (args.pagination?.pageIndex ?? 0) + 1,
    limit: args.all ? undefined : args.pagination?.pageSize,
    all: args.all ? true : undefined,
    filters: serializeTasksDomain(args.domain ?? null),
    groupBy: args.groupBy?.length ? JSON.stringify(args.groupBy) : undefined,
  });

  return apiRequest<SearchResult<TaskRecord>>(`/tasks${query}`, {}, token);
}

export async function readTask(token: string, id: string) {
  return apiRequest<TaskRecord>(`/tasks/${id}`, {}, token);
}

export async function createTaskRecordRemote(token: string, payload: TaskMutationInput) {
  return apiRequest<TaskRecord>("/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export async function updateTaskRecordRemote(
  token: string,
  id: string,
  payload: Partial<TaskMutationInput>,
) {
  return apiRequest<TaskRecord>(`/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }, token);
}

export async function deleteTaskRecordRemote(token: string, id: string) {
  await apiRequest(`/tasks/${id}`, { method: "DELETE" }, token);
}

export async function searchTaskAudit(
  token: string,
  args: SearchArgs,
): Promise<DetailAuditLogListResponse> {
  const entityId = typeof args.context?.entityId === "string" ? args.context.entityId : "";
  if (!entityId) {
    throw new Error("entityId ausente para auditoria da tarefa.");
  }

  const query = buildQuery({
    page:
      typeof args.pagination?.pageIndex === "number"
        ? args.pagination.pageIndex + 1
        : undefined,
    limit: args.pagination?.pageSize,
  });

  return apiRequest<DetailAuditLogListResponse>(`/tasks/${entityId}/audit${query}`, {}, token);
}

export async function addTaskChecklistItemRemote(
  token: string,
  taskId: string,
  payload: TaskChecklistItemMutationInput,
) {
  return apiRequest<TaskRecord>(`/tasks/${taskId}/checklist`, {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export async function toggleTaskChecklistItemRemote(
  token: string,
  taskId: string,
  itemId: string,
) {
  return apiRequest<TaskRecord>(`/tasks/${taskId}/checklist/${itemId}/toggle`, {
    method: "PATCH",
  }, token);
}

export async function updateTaskChecklistItemRemote(
  token: string,
  taskId: string,
  itemId: string,
  payload: TaskChecklistItemMutationInput,
) {
  return apiRequest<TaskRecord>(`/tasks/${taskId}/checklist/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }, token);
}

export async function deleteTaskChecklistItemRemote(
  token: string,
  taskId: string,
  itemId: string,
) {
  return apiRequest<TaskRecord>(`/tasks/${taskId}/checklist/${itemId}`, {
    method: "DELETE",
  }, token);
}

export async function addTaskSubtaskRemote(
  token: string,
  taskId: string,
  payload: TaskSubtaskMutationInput,
) {
  return apiRequest<TaskRecord>(`/tasks/${taskId}/subtasks`, {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export async function toggleTaskSubtaskStatusRemote(
  token: string,
  taskId: string,
  subtaskId: string,
) {
  return apiRequest<TaskRecord>(`/tasks/${taskId}/subtasks/${subtaskId}/toggle-status`, {
    method: "PATCH",
  }, token);
}

export async function updateTaskSubtaskRemote(
  token: string,
  taskId: string,
  subtaskId: string,
  payload: Partial<TaskSubtaskMutationInput>,
) {
  return apiRequest<TaskRecord>(`/tasks/${taskId}/subtasks/${subtaskId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }, token);
}

export async function deleteTaskSubtaskRemote(
  token: string,
  taskId: string,
  subtaskId: string,
) {
  return apiRequest<TaskRecord>(`/tasks/${taskId}/subtasks/${subtaskId}`, {
    method: "DELETE",
  }, token);
}

export async function addTaskCommentRemote(
  token: string,
  taskId: string,
  payload: TaskCommentMutationInput,
) {
  return apiRequest<TaskRecord>(`/tasks/${taskId}/comments`, {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export async function deleteTaskCommentRemote(
  token: string,
  taskId: string,
  commentId: string,
) {
  return apiRequest<TaskRecord>(`/tasks/${taskId}/comments/${commentId}`, {
    method: "DELETE",
  }, token);
}

export async function addTaskAttachmentRemote(
  token: string,
  taskId: string,
  payload: TaskAttachmentMutationInput,
) {
  return apiRequest<TaskRecord>(`/tasks/${taskId}/attachments`, {
    method: "POST",
    body: JSON.stringify(payload),
  }, token);
}

export async function deleteTaskAttachmentRemote(
  token: string,
  taskId: string,
  attachmentId: string,
) {
  return apiRequest<TaskRecord>(`/tasks/${taskId}/attachments/${attachmentId}`, {
    method: "DELETE",
  }, token);
}

export async function addTaskDependencyRemote(
  token: string,
  taskId: string,
  dependsOnTaskId: string,
) {
  return apiRequest<TaskRecord>(`/tasks/${taskId}/dependencies`, {
    method: "POST",
    body: JSON.stringify({ dependsOnTaskId }),
  }, token);
}

export async function deleteTaskDependencyRemote(
  token: string,
  taskId: string,
  dependencyId: string,
) {
  return apiRequest<TaskRecord>(`/tasks/${taskId}/dependencies/${dependencyId}`, {
    method: "DELETE",
  }, token);
}

export async function listTaskAssignableUsersRemote(token: string, q?: string) {
  const query = buildQuery({ q: q?.trim() || undefined });
  return apiRequest<TaskAssignableUser[]>(`/tasks/assignable-users${query}`, {}, token);
}
