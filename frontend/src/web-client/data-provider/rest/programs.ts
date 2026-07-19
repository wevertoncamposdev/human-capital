"use client";

import type { SearchArgs, SearchResult } from "@/web-client/data-provider/types";
import {
  getProgram,
  listPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
} from "@/modules/programs/api";
import type { ApiProgram } from "@/modules/programs/api";

export async function searchPrograms(
  token: string,
  args: SearchArgs,
): Promise<SearchResult<ApiProgram>> {
  return listPrograms(token, {
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
  getProgram as readProgram,
  createProgram as createProgramRecord,
  updateProgram as updateProgramRecord,
  deleteProgram as deleteProgramRecord,
};
