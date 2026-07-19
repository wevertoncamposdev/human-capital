"use client";

import type { SearchArgs, SearchResult } from "@/web-client/data-provider/types";
import { listAllProjectGroups } from "@/modules/projects/api";
import type { ApiProjectGroup } from "@/modules/projects/api";

export async function searchProjectGroups(
  token: string,
  args: SearchArgs,
): Promise<SearchResult<ApiProjectGroup>> {
  return listAllProjectGroups(token, {
    q: args.searchText?.trim() || undefined,
    page:
      typeof args.pagination?.pageIndex === "number"
        ? args.pagination.pageIndex + 1
        : undefined,
    limit: args.pagination?.pageSize,
    all: args.all,
  });
}
