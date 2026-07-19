"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useBreadcrumb } from "@/components/layout/BreadcrumbContext";
import { useAuth } from "@/features/auth/auth-context";
import { useRequireAuth } from "@/hooks/use-require-auth";
import {
  getDashboardOverview,
  type DashboardOverviewResponse,
} from "@/modules/core/api/dashboard";
import { Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis, YAxis } from "recharts";

const attendanceConfig = {
  attendances: {
    label: "Atendimentos",
    color: "#2563eb",
  },
  actionsExecuted: {
    label: "Ações executadas",
    color: "#0f766e",
  },
} satisfies ChartConfig;

const PIE_COLORS = [
  "#2563eb",
  "#0f766e",
  "#f97316",
  "#a855f7",
  "#22c55e",
  "#e11d48",
  "#0891b2",
  "#ca8a04",
] as const;

function toDateInputValue(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatMonthKey(value: string) {
  const [yearRaw, monthRaw] = value.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!year || !month) return value;
  const date = new Date(Date.UTC(year, month - 1, 1));
  const monthLabel = new Intl.DateTimeFormat("pt-BR", {
    month: "short",
  })
    .format(date)
    .replace(".", "");
  return `${monthLabel}/${String(year).slice(-2)}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatNumber(value?: number | null) {
  return new Intl.NumberFormat("pt-BR").format(value ?? 0);
}

function describeAuditAction(action: "CREATE" | "UPDATE" | "DELETE") {
  if (action === "CREATE") return "Criou";
  if (action === "UPDATE") return "Atualizou";
  return "Excluiu";
}

const ENTITY_LABELS: Record<string, string> = {
  Person: "Pessoa",
  Household: "Residência",
  Project: "Projeto",
  Program: "Programa",
  ProjectAction: "Ação",
  ProjectEnrollment: "Matrícula",
  PantryEntry: "Entrada (Despensa)",
  PantryExit: "Saída (Despensa)",
  PantryItem: "Item (Despensa)",
  User: "Usuário",
};

async function downloadChartPng(params: {
  container: HTMLDivElement | null;
  fileBaseName: string;
}) {
  const container = params.container;
  if (!container) return;
  const svg = container.querySelector("svg");
  if (!svg) return;

  const cloned = svg.cloneNode(true) as SVGSVGElement;
  if (!cloned.getAttribute("xmlns")) {
    cloned.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }

  const serialized = new XMLSerializer().serializeToString(cloned);
  const blob = new Blob([serialized], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);

  try {
    const img = new Image();
    img.decoding = "async";

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Falha ao carregar imagem do SVG."));
      img.src = url;
    });

    const width = Math.max(320, svg.clientWidth || 0);
    const height = Math.max(240, svg.clientHeight || 0);
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(width * scale);
    canvas.height = Math.floor(height * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.drawImage(img, 0, 0, width, height);

    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/png"),
    );
    if (!pngBlob) return;

    const a = document.createElement("a");
    a.download = `${params.fileBaseName}.png`;
    a.href = URL.createObjectURL(pngBlob);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function CoreDashboardClientPage() {
  const { token } = useAuth();
  const { isAuthenticated, isLoading: authLoading } = useRequireAuth();
  const { setPageBreadcrumb } = useBreadcrumb();
  const [isHydrated, setIsHydrated] = React.useState(false);

  const [overview, setOverview] = React.useState<DashboardOverviewResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const defaultTo = React.useMemo(() => toDateInputValue(new Date()), []);
  const defaultFrom = React.useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    return toDateInputValue(from);
  }, []);

  const [draftFrom, setDraftFrom] = React.useState(defaultFrom);
  const [draftTo, setDraftTo] = React.useState(defaultTo);
  const [range, setRange] = React.useState({ from: defaultFrom, to: defaultTo });

  const attendanceChartRef = React.useRef<HTMLDivElement | null>(null);
  const typeChartRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setPageBreadcrumb("Dashboard", []);
  }, [setPageBreadcrumb]);

  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  const loadOverview = React.useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await getDashboardOverview(token, {
        from: range.from || undefined,
        to: range.to || undefined,
      });
      setOverview(response);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Falha ao carregar dashboard.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [token, range.from, range.to]);

  React.useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !token) return;
    loadOverview();
  }, [authLoading, isAuthenticated, token, loadOverview]);

  const appliedPeriodLabel = React.useMemo(() => {
    const from = range.from?.trim();
    const to = range.to?.trim();
    if (!from && !to) return "Últimos 30 dias";
    if (from && !to) return `Desde ${from}`;
    if (!from && to) return `Até ${to}`;
    return `${from} → ${to}`;
  }, [range.from, range.to]);

  const genderTotals = React.useMemo(() => {
    const rows = overview?.socialAnalysis.gender ?? [];
    const map = new Map(rows.map((r) => [r.key, r.total]));
    const men = map.get("Homem") ?? 0;
    const women = map.get("Mulher") ?? 0;
    const other = rows.reduce((acc, row) => {
      if (row.key === "Homem" || row.key === "Mulher") return acc;
      return acc + row.total;
    }, 0);
    return { men, women, other };
  }, [overview]);

  const attendanceSeries = React.useMemo(() => {
    return (overview?.series ?? []).map((row) => ({
      month: formatMonthKey(row.month),
      attendances: row.attendances,
      actionsExecuted: row.actionsExecuted,
    }));
  }, [overview]);

  const actionTypeData = React.useMemo(() => {
    const rows = overview?.actionsByType ?? [];
    const top = rows.slice(0, 6);
    const otherTotal = rows.slice(6).reduce((acc, row) => acc + row.total, 0);
    const withOther =
      otherTotal > 0
        ? [...top, { actionTypeId: "other", name: "Outros", total: otherTotal }]
        : top;

    return withOther.map((row, index) => ({
      name: row.name,
      total: row.total,
      fill: PIE_COLORS[index % PIE_COLORS.length],
    }));
  }, [overview]);

  const typesConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    actionTypeData.forEach((row) => {
      config[row.name] = { label: row.name, color: row.fill };
    });
    return config;
  }, [actionTypeData]);

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Carregando dashboard...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            ONG
          </p>
          <h1 className="text-2xl font-semibold">Visao geral da ONG</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Período: {appliedPeriodLabel}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground">De</p>
              <Input
                type="date"
                value={draftFrom}
                onChange={(e) => setDraftFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground">Até</p>
              <Input
                type="date"
                value={draftTo}
                onChange={(e) => setDraftTo(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setRange({ from: draftFrom, to: draftTo })}
              disabled={isLoading}
            >
              Aplicar
            </Button>
            <Button variant="outline" onClick={loadOverview} disabled={isLoading}>
              Atualizar
            </Button>
          </div>
        </div>
      </header>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle>Não foi possível carregar o dashboard</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={loadOverview}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-[0.3em]">
              Atendidos ativos
            </CardDescription>
            <CardTitle className="text-2xl">
              {formatNumber(overview?.people.attendedActive)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Pessoas do tipo Atendido com status Ativo.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-[0.3em]">
              Familiares ativos
            </CardDescription>
            <CardTitle className="text-2xl">
              {formatNumber(overview?.people.familyActive)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Pessoas do tipo Familiar com status Ativo.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-[0.3em]">
              Atendidos em espera
            </CardDescription>
            <CardTitle className="text-2xl">
              {formatNumber(overview?.people.attendedWaiting)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Pessoas do tipo Atendido em “Em espera”.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-[0.3em]">
              Total de atendimentos
            </CardDescription>
            <CardTitle className="text-2xl">
              {formatNumber(overview?.totals.attendances)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Presenças registradas no período.
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-[0.3em]">
              Ações realizadas
            </CardDescription>
            <CardTitle className="text-2xl">
              {formatNumber(overview?.totals.actionsExecuted)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Ações executadas no período.
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Atendimentos e ações por mês</CardTitle>
              <CardDescription>Evolução no período selecionado.</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!isHydrated}
              onClick={() =>
                downloadChartPng({
                  container: attendanceChartRef.current,
                  fileBaseName: "dashboard-atendimentos-acoes",
                })
              }
            >
              Download
            </Button>
          </CardHeader>
          <CardContent>
            {isHydrated ? (
              <div ref={attendanceChartRef}>
                <ChartContainer config={attendanceConfig} className="h-[280px] w-full">
                  <BarChart data={attendanceSeries} accessibilityLayer>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} width={36} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="attendances"
                      fill={attendanceConfig.attendances.color}
                      radius={4}
                    />
                    <Bar
                      dataKey="actionsExecuted"
                      fill={attendanceConfig.actionsExecuted.color}
                      radius={4}
                    />
                  </BarChart>
                </ChartContainer>
              </div>
            ) : (
              <div className="h-[280px] rounded-xl border border-dashed border-border/60 bg-muted/20" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Análise social</CardTitle>
            <CardDescription>
              Base: {overview?.socialAnalysis.base.personType ?? "Atendido"}{" "}
              {overview?.socialAnalysis.base.status
                ? `(${overview.socialAnalysis.base.status})`
                : null}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Gênero
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-background p-3">
                  <p className="text-[11px] text-muted-foreground">Homem</p>
                  <p className="text-lg font-semibold">
                    {formatNumber(genderTotals.men)}
                  </p>
                </div>
                <div className="rounded-lg border bg-background p-3">
                  <p className="text-[11px] text-muted-foreground">Mulher</p>
                  <p className="text-lg font-semibold">
                    {formatNumber(genderTotals.women)}
                  </p>
                </div>
                <div className="rounded-lg border bg-background p-3">
                  <p className="text-[11px] text-muted-foreground">Outros</p>
                  <p className="text-lg font-semibold">
                    {formatNumber(genderTotals.other)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Raça/Cor
              </p>
              <div className="space-y-2">
                {(overview?.socialAnalysis.raceColor ?? [])
                  .slice(0, 6)
                  .map((row) => (
                    <div
                      key={row.key}
                      className="flex items-center justify-between gap-4"
                    >
                      <p className="text-sm font-medium">{row.key}</p>
                      <p className="text-sm tabular-nums text-muted-foreground">
                        {formatNumber(row.total)}
                      </p>
                    </div>
                  ))}
                {overview && overview.socialAnalysis.raceColor.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados.</p>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Distribuição por tipo de ação</CardTitle>
              <CardDescription>Top tipos no período.</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!isHydrated}
              onClick={() =>
                downloadChartPng({
                  container: typeChartRef.current,
                  fileBaseName: "dashboard-tipos-de-acao",
                })
              }
            >
              Download
            </Button>
          </CardHeader>
          <CardContent>
            {isHydrated ? (
              <div ref={typeChartRef}>
                <ChartContainer config={typesConfig} className="h-[260px]">
                  <PieChart>
                    <ChartTooltip
                      content={<ChartTooltipContent nameKey="name" labelKey="name" />}
                    />
                    <Pie
                      data={actionTypeData}
                      dataKey="total"
                      nameKey="name"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={4}
                      stroke="var(--background)"
                    />
                    <ChartLegend
                      content={<ChartLegendContent nameKey="name" />}
                      verticalAlign="bottom"
                    />
                  </PieChart>
                </ChartContainer>
              </div>
            ) : (
              <div className="h-[260px] rounded-xl border border-dashed border-border/60 bg-muted/20" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atividades recentes</CardTitle>
            <CardDescription>Últimas ações no sistema (por período).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(overview?.recentActivities ?? []).map((item, index, all) => {
              const entityLabel = ENTITY_LABELS[item.entity] ?? item.entity;
              const who = item.user?.name?.trim() || item.user?.email || "Sistema";
              return (
                <div key={item.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">
                        {describeAuditAction(item.action)} {entityLabel}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(item.createdAt)} · {who}
                      </p>
                    </div>
                  </div>
                  {index < all.length - 1 ? <Separator className="mt-4" /> : null}
                </div>
              );
            })}
            {overview && overview.recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sem atividades no período selecionado.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

export default CoreDashboardClientPage;
