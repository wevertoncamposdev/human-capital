"use client";

import type { SearchArgs, SearchResult } from "@/web-client/data-provider/types";
import { listActions } from "@/modules/actions/api";
import type { ApiProjectAction } from "@/modules/actions/api";

export async function searchActions(
  token: string,
  args: SearchArgs,
): Promise<SearchResult<ApiProjectAction>> {
  return listActions(token, {
    q: args.searchText?.trim() || undefined,
    mine: typeof args.context?.onlyMine === "boolean" ? args.context.onlyMine : undefined,
    projectId:
      typeof args.context?.projectId === "string" && args.context.projectId.trim()
        ? args.context.projectId
        : undefined,
    projectGroupId:
      typeof args.context?.groupId === "string" && args.context.groupId.trim()
        ? args.context.groupId
        : undefined,
    peopleGroupId:
      typeof args.context?.peopleGroupId === "string" && args.context.peopleGroupId.trim()
        ? args.context.peopleGroupId
        : undefined,
    page:
      typeof args.pagination?.pageIndex === "number"
        ? args.pagination.pageIndex + 1
        : undefined,
    limit: args.pagination?.pageSize,
  });
}
