import { apiRequest } from "@/lib/api";
import type { PantryDashboardResponse } from "./types";

export async function getPantryDashboard(token: string) {
  return apiRequest<PantryDashboardResponse>("/pantry/dashboard", {}, token);
}

