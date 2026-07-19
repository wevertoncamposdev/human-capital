"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/auth-context";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { resolveMediaUrl } from "@/lib/api";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import {
  adminUsersListModuleDefinition,
  type AdminUsersListQueryState,
  type AdminUsersListViewId,
} from "@/modules/core/admin/config/admin-module-contract";
import { createRestDataProvider } from "@/web-client/data-provider";
import { removeConditionAtIndex } from "@/web-client/domain/conditions";
import { parseDomain, serializeDomain } from "@/web-client/domain/serialize";
import { buildQueryFacets } from "@/web-client/control-panel/queryFacets";
import { EntityModuleShell } from "@/web-client/record/RecordListHost";
import {
  canUseModuleAction,
  getModuleGraphBuilderConfig,
  hasModulePermission,
} from "@/web-client/registry/module-utils";
import { useModuleQueryState } from "@/web-client/screen/useModuleQueryState";
import { CalendarView } from "@/web-client/views/CalendarView";
import { GraphView } from "@/web-client/views/GraphView";
import { KanbanView } from "@/web-client/views/KanbanView";
import { ListView } from "@/web-client/views/ListView";
import { TimelineView } from "@/web-client/views/TimelineView";
import { PaginationBar } from "@/web-client/ui/PaginationBar";
import {
  badgeToneClassName,
  booleanLabel,
  buildAnalysisFacets,
  buildAnalysisSlot,
  buildFavoriteSnapshot,
  buildGraphModel,
  formatDateTimeLabel,
  hasActiveAnalysis,
  parseAdminCollectionState,
  renderLoadingState,
  serializeAdminCollectionState,
  toDate,
  trimText,
} from "@/modules/core/admin/ui/admin-list-shared";
import type { AdminFavoriteState } from "@/modules/core/admin/ui/admin-list-shared";
import { ADMIN_ROUTES } from "@/modules/core/admin/admin.constants";
import type { AdminUserRecord } from "@/modules/core/admin/admin.types";

function userInitials(user: AdminUserRecord) {
  return trimText(user.name, user.email)
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function UserKanbanCard({ user }: { user: AdminUserRecord }) {
  return (
    <div className="space-y-2 rounded-md border border-border/60 bg-background px-3 py-3 text-left">
      <div className="flex items-center gap-3">
        <Avatar className="size-9 border border-border/60">
          {user.avatarUrl ? <AvatarImage src={resolveMediaUrl(user.avatarUrl)} alt={trimText(user.name, user.email)} /> : null}
          <AvatarFallback>{userInitials(user)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-foreground">{trimText(user.name, user.email)}</div>
          <div className="truncate text-xs text-muted-foreground">{user.email}</div>
        </div>
      </div>
      <div className="grid gap-1 text-[11px] text-muted-foreground">
        <div className="flex items-center justify-between gap-2">
          <span>Status</span>
          <span>{booleanLabel(user.isActive)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>Perfis</span>
          <span>{user.roleNames.length || 0}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>MFA</span>
          <span>{booleanLabel(user.mfaTotpEnabled)}</span>
        </div>
      </div>
    </div>
  );
}

function UserCalendarItem({ user }: { user: AdminUserRecord }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background px-3 py-3">
      <div className="flex items-center gap-3">
        <Avatar className="size-9 border border-border/60">
          {user.avatarUrl ? <AvatarImage src={resolveMediaUrl(user.avatarUrl)} alt={trimText(user.name, user.email)} /> : null}
          <AvatarFallback>{userInitials(user)}</AvatarFallback>
        </Avatar>
        <div className="truncate text-sm font-medium text-foreground">{trimText(user.name, user.email)}</div>
      </div>
      <div className="mt-2 grid gap-1 text-[12px]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Email</span>
          <span className="truncate text-foreground">{user.email}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Status</span>
          <span className="text-foreground">{booleanLabel(user.isActive)}</span>
        </div>
      </div>
    </div>
  );
}

function userColumns(): ColumnDef<AdminUserRecord>[] {
  return [
    {
      accessorKey: "name",
      header: "Nome",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-9 border border-border/60">
            {row.original.avatarUrl ? (
              <AvatarImage
                src={resolveMediaUrl(row.original.avatarUrl)}
                alt={trimText(row.original.name, row.original.email)}
              />
            ) : null}
            <AvatarFallback>{userInitials(row.original)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate font-medium text-foreground">
              {trimText(row.original.name, row.original.email)}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <span className="text-foreground">{row.original.email}</span>,
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={`rounded-full px-2 text-[10px] ${badgeToneClassName(row.original.isActive)}`}>
          {booleanLabel(row.original.isActive)}
        </Badge>
      ),
    },
    {
      accessorKey: "roleNames",
      header: "Perfis",
      cell: ({ row }) => <span className="text-foreground">{row.original.roleNames.join(", ") || "Sem perfil"}</span>,
    },
    {
      accessorKey: "mfaTotpEnabled",
      header: "MFA",
      cell: ({ row }) => <span className="text-foreground">{booleanLabel(row.original.mfaTotpEnabled)}</span>,
    },
    {
      accessorKey: "createdAt",
      header: "Criado em",
      cell: ({ row }) => <span className="text-foreground">{formatDateTimeLabel(row.original.createdAt)}</span>,
    },
    {
      accessorKey: "updatedAt",
      header: "Atualizado em",
      cell: ({ row }) => <span className="text-foreground">{formatDateTimeLabel(row.original.updatedAt)}</span>,
    },
  ];
}

function resolveUserGroupLabel(field: string, value: unknown) {
  switch (field) {
    case "isActive":
    case "mfaTotpEnabled":
      return booleanLabel(value);
    default:
      return trimText(value, "Sem valor");
  }
}

export function AdminUsersListModuleClientPage() {
  const { token, isLoading: authLoading } = useAuth();
  const { permissions, isLoading: userLoading } = useCurrentUser();
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const dataProvider = React.useMemo(() => createRestDataProvider({ token }), [token]);
  const graphBuilder = getModuleGraphBuilderConfig(adminUsersListModuleDefinition);
  const columns = React.useMemo(() => userColumns(), []);

  const canRead = hasModulePermission(adminUsersListModuleDefinition, "canRead", permissions);
  const canCreate = canUseModuleAction(adminUsersListModuleDefinition, "create", permissions);

  const [rows, setRows] = React.useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [state, setState] = useModuleQueryState<AdminUsersListQueryState>({
    moduleDefinition: adminUsersListModuleDefinition,
    trackedKeys: [
      "view",
      "q",
      "d",
      "g",
      "page",
      "limit",
      "timelineField",
      "timelineSort",
      "calendarField",
      "calendarMode",
      "rangeFrom",
      "rangeTo",
      "graphGroupBy",
      "graphMetricField",
      "graphMetricOp",
      "graphTimeField",
      "graphTimeBucket",
      "graphChartType",
      "graphFilters",
    ],
    parse: (params) =>
      parseAdminCollectionState({
        params,
        defaultState: adminUsersListModuleDefinition.defaultQueryState,
        allowedViews: ["list", "kanban", "timeline", "calendar", "graph"],
        parseDomain: (value) => parseDomain(value) ?? null,
        graphBuilder,
      }) as AdminUsersListQueryState,
    serialize: (nextState) =>
      serializeAdminCollectionState(
        nextState,
        adminUsersListModuleDefinition.defaultQueryState,
        serializeDomain,
        graphBuilder,
      ),
  });

  const loadRows = React.useCallback(async () => {
    if (authLoading || userLoading) {
      setLoading(true);
      return;
    }

    if (!token || !canRead) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await dataProvider.search<AdminUserRecord>(
        adminUsersListModuleDefinition.queryAdapters.listDataProvider.model,
        {
          searchText: state.searchText,
          domain: state.domain,
          groupBy: state.groupBy,
          all: true,
        },
      );
      setRows(response.data);
    } catch (nextError) {
      const message =
        nextError && typeof nextError === "object" && "message" in nextError
          ? String((nextError as { message?: string }).message)
          : "Falha ao carregar usuarios.";
      setRows([]);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [authLoading, canRead, dataProvider, state.domain, state.groupBy, state.searchText, token, userLoading]);

  React.useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const totalCount = rows.length;
  const pageCount = Math.max(Math.ceil(Math.max(totalCount, 1) / state.pageSize), 1);
  const pageStart = state.pageIndex * state.pageSize;
  const pagedRows = rows.slice(pageStart, pageStart + state.pageSize);

  const openCreate = React.useCallback(() => {
    router.push(withTenantPath(ADMIN_ROUTES.usersNew, tenantSlug));
  }, [router, tenantSlug]);

  const openDetail = React.useCallback(
    (user: AdminUserRecord) => {
      router.push(withTenantPath(`${ADMIN_ROUTES.users}/${user.id}`, tenantSlug));
    },
    [router, tenantSlug],
  );

  const removeDomainCondition = React.useCallback(
    (index: number) => {
      setState((previous) => ({
        ...previous,
        domain: removeConditionAtIndex(previous.domain, "and", index),
        pageIndex: 0,
      }));
    },
    [setState],
  );

  const queryFacets = React.useMemo(
    () =>
      buildQueryFacets({
        domain: state.domain,
        groupBy: state.groupBy,
        searchView: adminUsersListModuleDefinition.searchConfig,
        onClearGroupBy: () => setState((previous) => ({ ...previous, groupBy: [] })),
        onClearDomain: () =>
          setState((previous) => ({ ...previous, domain: null, pageIndex: 0 })),
        onRemoveDomainCondition: removeDomainCondition,
      }),
    [removeDomainCondition, setState, state.domain, state.groupBy],
  );

  const analysisSlot = React.useMemo(
    () =>
      buildAnalysisSlot({
        moduleDefinition: adminUsersListModuleDefinition,
        state,
        setState,
        rows: rows as Array<Record<string, unknown>>,
      }),
    [rows, setState, state],
  );

  const analysisFacets = React.useMemo(
    () =>
      buildAnalysisFacets({
        moduleDefinition: adminUsersListModuleDefinition,
        state,
        setState,
      }),
    [setState, state],
  );

  const valueSuggestions = React.useMemo(() => {
    const roleNames = Array.from(
      new Set(rows.flatMap((row) => row.roleNames.map((role) => role.trim()).filter(Boolean))),
    ).sort((left, right) => left.localeCompare(right));

    return (fieldName: string) => {
      if (fieldName === "roleNames") return roleNames;
      return [];
    };
  }, [rows]);

  const graphModel = React.useMemo(
    () => buildGraphModel(rows as Array<Record<string, unknown>>, state, adminUsersListModuleDefinition),
    [rows, state],
  );

  const kanbanField = state.groupBy[0] || "isActive";

  if (!canRead) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Voce nao tem permissao para acessar esta area.</div>;
  }

  return (
    <EntityModuleShell<AdminUsersListQueryState, AdminFavoriteState<AdminUsersListViewId>>
      moduleDefinition={adminUsersListModuleDefinition}
      state={state}
      onStateChange={setState}
      queryFacets={queryFacets}
      analysisFacets={analysisFacets}
      valueSuggestions={valueSuggestions}
      favoriteSnapshot={buildFavoriteSnapshot(state)}
      mapFavoriteToState={(snapshot) => snapshot}
      isLoading={loading}
      onRefresh={loadRows}
      totalCount={totalCount}
      onCreate={openCreate}
      canCreate={canCreate}
      analysisSlot={analysisSlot}
      hasActiveAnalysis={hasActiveAnalysis(adminUsersListModuleDefinition, state)}
      onResetAnalysis={() =>
        setState((previous) => ({
          ...previous,
          groupBy: [],
          pageIndex: 0,
          timelineField: adminUsersListModuleDefinition.defaultQueryState.timelineField,
          timelineSortDirection:
            adminUsersListModuleDefinition.defaultQueryState.timelineSortDirection,
          calendarField: adminUsersListModuleDefinition.defaultQueryState.calendarField,
          calendarMode: adminUsersListModuleDefinition.defaultQueryState.calendarMode,
          rangeFrom: adminUsersListModuleDefinition.defaultQueryState.rangeFrom,
          rangeTo: adminUsersListModuleDefinition.defaultQueryState.rangeTo,
          graph: adminUsersListModuleDefinition.defaultQueryState.graph,
        }))
      }
    >
      {error ? (
        renderLoadingState(error)
      ) : loading ? (
        renderLoadingState("Carregando usuarios...")
      ) : state.view === "kanban" ? (
        <KanbanView
          items={rows}
          getColumnKey={(user) => {
            if (kanbanField === "roleNames") return user.roleNames[0] ?? "Sem perfil";
            if (kanbanField === "isActive" || kanbanField === "mfaTotpEnabled") {
              return booleanLabel(user[kanbanField]);
            }
            return trimText(user[kanbanField as keyof AdminUserRecord], "Sem valor");
          }}
          getColumnLabel={(value) => trimText(value, "Sem valor")}
          renderCard={(user) => (
            <button type="button" className="text-left" onClick={() => openDetail(user)}>
              <UserKanbanCard user={user} />
            </button>
          )}
        />
      ) : state.view === "timeline" ? (
        <TimelineView
          items={rows}
          getDate={(user) => toDate(user[state.timelineField as keyof AdminUserRecord] as string | null | undefined)}
          renderTitle={(user) => trimText(user.name, user.email)}
          renderBody={(user) => `${user.email} • ${booleanLabel(user.isActive)}`}
          sortDirection={state.timelineSortDirection}
        />
      ) : state.view === "calendar" ? (
        <CalendarView
          items={rows}
          getDate={(user) => toDate(user[state.calendarField as keyof AdminUserRecord] as string | null | undefined)}
          renderItem={(user) => <UserCalendarItem user={user} />}
          mode={state.calendarMode}
          onModeChange={(calendarMode) =>
            setState((previous) => ({ ...previous, calendarMode }))
          }
          showModeSelect={false}
          showDateFieldSelect={false}
          showRangeInputs={false}
        />
      ) : state.view === "graph" ? (
        graphModel ? (
          <GraphView
            data={graphModel.data}
            xKey={graphModel.xKey}
            chartType={graphModel.chartType}
            series={graphModel.series}
            height={420}
            emptyState={graphModel.emptyState}
            downloadFileName={graphModel.downloadFileName}
          />
        ) : null
      ) : (
        <>
          <ListView<AdminUserRecord>
            data={pagedRows}
            columns={columns}
            getRowId={(row) => row.id}
            groupByFields={state.groupBy}
            resolveGroupLabel={resolveUserGroupLabel}
            onRowClick={openDetail}
            initialColumnPinning={{ left: ["name"] }}
          />

          <PaginationBar
            pageIndex={state.pageIndex}
            pageSize={state.pageSize}
            pageCount={pageCount}
            onPageIndexChange={(pageIndex) =>
              setState((previous) => ({ ...previous, pageIndex }))
            }
            onPageSizeChange={(pageSize) =>
              setState((previous) => ({ ...previous, pageSize, pageIndex: 0 }))
            }
          />
        </>
      )}
    </EntityModuleShell>
  );
}
