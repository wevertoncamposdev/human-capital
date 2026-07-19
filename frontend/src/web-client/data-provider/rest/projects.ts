"use client";

import type { SearchArgs, SearchResult } from "@/web-client/data-provider/types";
import {
  getProject,
  listProjects,
  createProject,
  updateProject,
  deleteProject,
} from "@/modules/projects/api";
import type { ApiProject } from "@/modules/projects/api";

export async function searchProjects(
  token: string,
  args: SearchArgs,
): Promise<SearchResult<ApiProject>> {
  return listProjects(token, {
    q: args.searchText?.trim() || undefined,
    page:
      typeof args.pagination?.pageIndex === "number"
        ? args.pagination.pageIndex + 1
        : undefined,
    limit: args.pagination?.pageSize,
    all: args.all,
  });
}

export {
  getProject as readProject,
  createProject as createProjectRecord,
  updateProject as updateProjectRecord,
  deleteProject as deleteProjectRecord,
};
