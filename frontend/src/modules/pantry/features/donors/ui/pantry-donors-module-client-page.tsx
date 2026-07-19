"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { usePathname, useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/auth-context";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { formatDateOnlyPtBR } from "@/lib/date";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import type { ApiPantryDonor } from "@/modules/pantry/api";
import {
  pantryDonorsModuleDefinition,
  type PantryDonorsQueryState,
} from "@/modules/pantry/config/pantry-module-contract";
import { PANTRY_ROUTES } from "@/modules/pantry/shared/domain/pantry.constants";
import { buildQueryFacets } from "@/web-client/control-panel/queryFacets";
import { createRestDataProvider } from "@/web-client/data-provider";
import { removeConditionAtIndex } from "@/web-client/domain/conditions";
import { parseDomain, serializeDomain } from "@/web-client/domain/serialize";
import { EntityModuleShell } from "@/web-client/record/RecordListHost";
import {
  canUseModuleAction,
  getModuleActionLabel,
  getModuleFieldEmptyValueLabel,
  getModuleFieldLabel,
  hasModulePermission,
} from "@/web-client/registry/module-utils";
import { useModuleQueryState } from "@/web-client/screen/useModuleQueryState";
import { PaginationBar } from "@/web-client/ui/PaginationBar";
import { ListView } from "@/web-client/views/ListView";

type PantryDonorsFavoriteState = Pick<
  PantryDonorsQueryState,
  "searchText" | "domain" | "groupBy" | "pageSize"
>;

function parsePositiveInt(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

const parseQueryState = (
  params: URLSearchParams,
): PantryDonorsQueryState => {
  const searchText = params.get("q") ?? "";
  const domain = parseDomain(params.get("d")) ?? null;
  const groupParam = params.get("g");
  const groupBy =
    groupParam === "none"
      ? []
      : (groupParam ?? "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
  const page = parsePositiveInt(params.get("page"), 1);
  const limit = parsePositiveInt(params.get("limit"), 50);

  return {
    view: "list",
    searchText,
    domain,
    groupBy,
    pageIndex: page - 1,
    pageSize: Math.min(Math.max(limit, 1), 200),
  };
};

const serializeQueryState = (state: PantryDonorsQueryState) => ({
  q: state.searchText.trim() ? state.searchText.trim() : undefined,
  d: state.domain ? serializeDomain(state.domain) : undefined,
  g: state.groupBy.length ? state.groupBy.join(",") : undefined,
  page: state.pageIndex > 0 ? String(state.pageIndex + 1) : undefined,
  limit: state.pageSize === 50 ? undefined : String(state.pageSize),
});

function typeLabel(value: ApiPantryDonor["type"]) {
  return value === "COMPANY" ? "Empresa" : "Pessoa";
}

export function PantryDonorsModuleClientPage() {
  const { token } = useAuth();
  const { permissions } = useCurrentUser();
  const canRead = hasModulePermission(
    pantryDonorsModuleDefinition,
    "canRead",
    permissions,
  );
  const canCreate = canUseModuleAction(
    pantryDonorsModuleDefinition,
    "create",
    permissions,
  );
  const createLabel = React.useMemo(
    () => getModuleActionLabel(pantryDonorsModuleDefinition, "create", "Novo"),
    [],
  );
  const createItemLabel = React.useMemo(
    () =>
      getModuleActionLabel(
        pantryDonorsModuleDefinition,
        "createItem",
        "Novo alimento",
      ),
    [],
  );
  const createDonorLabel = React.useMemo(
    () =>
      getModuleActionLabel(
        pantryDonorsModuleDefinition,
        "create",
        "Novo doador",
      ),
    [],
  );
  const contactEmptyLabel = React.useMemo(
    () =>
      getModuleFieldEmptyValueLabel(
        pantryDonorsModuleDefinition,
        "contact",
        "Sem contato",
      ),
    [],
  );

  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);

  const [state, setState] = useModuleQueryState<PantryDonorsQueryState>({
    moduleDefinition: pantryDonorsModuleDefinition,
    trackedKeys: ["q", "d", "g", "page", "limit"],
    parse: parseQueryState,
    serialize: serializeQueryState,
  });

  const dataProvider = React.useMemo(
    () => createRestDataProvider({ token }),
    [token],
  );

  const [loading, setLoading] = React.useState(false);
  const [rows, setRows] = React.useState<ApiPantryDonor[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [pageCount, setPageCount] = React.useState(0);

  const requestKey = React.useMemo(
    () =>
      JSON.stringify({
        q: state.searchText,
        d: state.domain,
        p: state.pageIndex,
        l: state.pageSize,
      }),
    [state.domain, state.pageIndex, state.pageSize, state.searchText],
  );

  const loadRows = React.useCallback(async () => {
    if (!token || !canRead) return;
    setLoading(true);
    try {
      const response = await dataProvider.search<ApiPantryDonor>(
        pantryDonorsModuleDefinition.queryAdapters.listDataProvider.model,
        {
          domain: state.domain,
          searchText: state.searchText.trim()
            ? state.searchText.trim()
            : undefined,
          pagination: {
            pageIndex: state.pageIndex,
            pageSize: state.pageSize,
          },
        },
      );

      setRows(response.data ?? []);
      setTotalCount(response.pagination.total);
      setPageCount(response.pagination.pages);
    } finally {
      setLoading(false);
    }
  }, [
    canRead,
    dataProvider,
    state.domain,
    state.pageIndex,
    state.pageSize,
    state.searchText,
    token,
  ]);

  React.useEffect(() => {
    void loadRows();
  }, [loadRows, requestKey]);

  const openDonor = React.useCallback(
    (row: ApiPantryDonor) => {
      router.push(withTenantPath(`${PANTRY_ROUTES.donors}/${row.id}`, tenantSlug));
    },
    [router, tenantSlug],
  );

  const openCreateDonor = React.useCallback(() => {
    router.push(withTenantPath(PANTRY_ROUTES.donorsNew, tenantSlug));
  }, [router, tenantSlug]);

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
        searchView: pantryDonorsModuleDefinition.searchConfig,
        onClearGroupBy: () =>
          setState((previous) => ({ ...previous, groupBy: [] })),
        onClearDomain: () =>
          setState((previous) => ({
            ...previous,
            domain: null,
            pageIndex: 0,
          })),
        onRemoveDomainCondition: removeDomainCondition,
      }),
    [removeDomainCondition, setState, state.domain, state.groupBy],
  );

  const valueSuggestions = React.useMemo(() => {
    const types = Array.from(new Set(rows.map((row) => row.type))).sort();

    return (fieldName: string) => {
      if (fieldName === "type") return types;
      return [];
    };
  }, [rows]);

  const columns = React.useMemo<ColumnDef<ApiPantryDonor, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: getModuleFieldLabel(pantryDonorsModuleDefinition, "name", "Nome"),
        cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
      },
      {
        accessorKey: "type",
        header: getModuleFieldLabel(pantryDonorsModuleDefinition, "type", "Tipo"),
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {typeLabel(row.original.type)}
          </div>
        ),
      },
      {
        accessorKey: "contact",
        header: getModuleFieldLabel(
          pantryDonorsModuleDefinition,
          "contact",
          "Contato",
        ),
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {row.original.contact ?? contactEmptyLabel}
          </div>
        ),
      },
      {
        accessorKey: "tags",
        header: "Tags",
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {row.original.tags?.length ? row.original.tags.slice(0, 3).join(", ") : "-"}
          </div>
        ),
      },
      {
        accessorKey: "createdAt",
        header: getModuleFieldLabel(
          pantryDonorsModuleDefinition,
          "createdAt",
          "Criado em",
        ),
        cell: ({ row }) => (
          <div className="text-sm text-muted-foreground">
            {formatDateOnlyPtBR(row.original.createdAt)}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: () => <div className="text-sm text-muted-foreground">Ativo</div>,
      },
    ],
    [contactEmptyLabel],
  );

  if (!canRead) {
    return (
      <div className="px-4 py-6 text-sm text-muted-foreground">
        Você não tem permissão.
      </div>
    );
  }

  return (
    <EntityModuleShell<PantryDonorsQueryState, PantryDonorsFavoriteState>
      moduleDefinition={pantryDonorsModuleDefinition}
      state={state}
      onStateChange={setState}
      queryFacets={queryFacets}
      valueSuggestions={valueSuggestions}
      favoriteSnapshot={{
        searchText: state.searchText,
        domain: state.domain,
        groupBy: state.groupBy,
        pageSize: state.pageSize,
      }}
      mapFavoriteToState={(snapshot) => ({
        searchText: snapshot.searchText,
        domain: snapshot.domain,
        groupBy: snapshot.groupBy,
        pageSize: snapshot.pageSize,
      })}
      isLoading={loading}
      totalCount={totalCount}
      primaryActionSlot={
        canCreate ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" className="h-8 gap-2">
                <Plus className="size-4" />
                {createLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onSelect={() =>
                  router.push(withTenantPath(PANTRY_ROUTES.itemsNew, tenantSlug))
                }
              >
                {createItemLabel}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={openCreateDonor}>
                {createDonorLabel}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : undefined
      }
      allowEmptyGroupBy
      groupByMode="multi"
    >
      <div className="flex flex-col gap-2">
        <ListView<ApiPantryDonor>
          data={rows}
          columns={columns}
          groupByFields={state.groupBy}
          resolveGroupLabel={(field, value) =>
            field === "type"
              ? typeLabel(value as ApiPantryDonor["type"])
              : String(value)
          }
          enableRowSelection={false}
          onRowClick={openDonor}
        />

        <PaginationBar
          pageIndex={state.pageIndex}
          pageCount={pageCount}
          pageSize={state.pageSize}
          disabled={loading}
          onPageIndexChange={(pageIndex) =>
            setState((previous) => ({ ...previous, pageIndex }))
          }
          onPageSizeChange={(pageSize) =>
            setState((previous) => ({
              ...previous,
              pageIndex: 0,
              pageSize,
            }))
          }
        />
      </div>
    </EntityModuleShell>
  );
}
