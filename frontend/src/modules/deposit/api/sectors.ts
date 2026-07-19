"use client";

import { apiRequest } from "@/lib/api";
import type { ApiDepositSector, DepositSectorInput, DepositSectorsListResponse } from "./types";

export async function listDepositSectors(token: string) {
  return apiRequest<DepositSectorsListResponse>("/Deposit/sectors", {}, token);
}

export async function createDepositSector(token: string, payload: DepositSectorInput) {
  return apiRequest<ApiDepositSector>(
    "/Deposit/sectors",
    { method: "POST", body: JSON.stringify(payload) },
    token,
  );
}

