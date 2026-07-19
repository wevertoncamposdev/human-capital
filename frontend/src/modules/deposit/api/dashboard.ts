import { apiRequest } from "@/lib/api";
import type { DepositDashboardResponse } from "./types";

export async function getDepositDashboard(token: string) {
  return apiRequest<DepositDashboardResponse>("/Deposit/dashboard", {}, token);
}

