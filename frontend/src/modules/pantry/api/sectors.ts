"use client";

import { apiRequest } from "@/lib/api";
import type { ApiPantrySector, PantrySectorInput, PantrySectorsListResponse } from "./types";

export async function listPantrySectors(token: string) {
  return apiRequest<PantrySectorsListResponse>("/pantry/sectors", {}, token);
}

export async function createPantrySector(token: string, payload: PantrySectorInput) {
  return apiRequest<ApiPantrySector>(
    "/pantry/sectors",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

