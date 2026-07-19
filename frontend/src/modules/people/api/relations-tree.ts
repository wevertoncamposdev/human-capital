import { apiRequest, buildQuery } from "@/lib/api";
import type { ApiPersonRelationsTreeResponse } from "./types";

export async function getPersonRelationsTree(
  token: string,
  id: string,
  params?: { depth?: number },
) {
  const query = buildQuery(params);
  return apiRequest<ApiPersonRelationsTreeResponse>(
    `/people/${id}/relations-tree${query}`,
    {},
    token,
  );
}

