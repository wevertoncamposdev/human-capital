import { apiRequest, buildQuery } from "@/lib/api";

export type DashboardOverviewResponse = {
  people: {
    attendedActive: number;
    familyActive: number;
    attendedWaiting: number;
  };
  socialAnalysis: {
    base: { personType: string; status: string };
    gender: Array<{ key: string; total: number }>;
    raceColor: Array<{ key: string; total: number }>;
  };
  period: {
    from: string;
    to: string;
  };
  totals: {
    attendances: number;
    actionsExecuted: number;
  };
  series: Array<{
    month: string;
    actionsExecuted: number;
    attendances: number;
  }>;
  actionsByType: Array<{
    actionTypeId: string;
    name: string;
    total: number;
  }>;
  recentActivities: Array<{
    id: string;
    action: "CREATE" | "UPDATE" | "DELETE";
    entity: string;
    entityId: string | null;
    createdAt: string;
    user: { id: string; name: string | null; email: string } | null;
  }>;
};

export async function getDashboardOverview(
  token: string,
  params?: { from?: string; to?: string },
) {
  const query = buildQuery(params);
  return apiRequest<DashboardOverviewResponse>(
    `/dashboard/overview${query}`,
    {},
    token,
  );
}

