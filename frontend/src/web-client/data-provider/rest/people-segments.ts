"use client";

import type { SearchArgs, SearchResult } from "@/web-client/data-provider/types";
import {
  createPeopleSegment,
  deletePeopleSegment,
  getPeopleSegment,
  listPeopleSegments,
  updatePeopleSegment,
} from "@/modules/people-segments/api";
import type { ApiPeopleSegment } from "@/modules/people-segments/api";

export async function searchPeopleSegments(
  token: string,
  args: SearchArgs,
): Promise<SearchResult<ApiPeopleSegment>> {
  return listPeopleSegments(token, {
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
  getPeopleSegment as readPeopleSegment,
  createPeopleSegment as createPeopleSegmentRecord,
  updatePeopleSegment as updatePeopleSegmentRecord,
  deletePeopleSegment as deletePeopleSegmentRecord,
};
