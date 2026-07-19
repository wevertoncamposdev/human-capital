"use client";

import type {
  DetailViewConfig,
  ListViewConfig,
  ModuleFeatureFlagMap,
  RecordQueryState,
  ViewSupportConfig,
} from "@/web-client/registry/types";
import { getStandardViewIcon } from "@/web-client/registry/view-icons";

export const STANDARD_LIST_SUPPORT: ViewSupportConfig = {
  supportsCreate: true,
  supportsSelection: true,
  supportsSearch: true,
  supportsGrouping: true,
  supportsPagination: true,
  supportsSort: true,
};

export const STANDARD_DETAIL_SUPPORT: ViewSupportConfig = {
  supportsCreate: false,
  supportsSelection: false,
  supportsSearch: false,
  supportsGrouping: false,
  supportsPagination: false,
  supportsSort: false,
};

export function createStandardListQueryState<
  TState extends RecordQueryState,
>(overrides: Partial<TState> = {}) {
  return {
    view: "list",
    searchText: "",
    domain: null,
    groupBy: [],
    pageIndex: 0,
    pageSize: 20,
    ...overrides,
  } as unknown as TState;
}

export function createStandardDetailQueryState<
  TState extends RecordQueryState,
>(overrides: Partial<TState> = {}) {
  return {
    view: "detail",
    searchText: "",
    domain: null,
    groupBy: [],
    pageIndex: 0,
    pageSize: 1,
    ...overrides,
  } as unknown as TState;
}

export function createStandardListView(
  overrides: Partial<ListViewConfig> = {},
): ListViewConfig {
  return {
    id: "list",
    title: "Tabela",
    viewType: "list",
    icon: getStandardViewIcon("list"),
    isDefault: true,
    supports: STANDARD_LIST_SUPPORT,
    params: {
      searchable: true,
      sortable: true,
      paginated: true,
      ...(overrides.params ?? {}),
    },
    ...overrides,
  };
}

export function createStandardDetailView(
  overrides: Partial<DetailViewConfig> = {},
): DetailViewConfig {
  return {
    id: "detail",
    title: "Detalhe",
    viewType: "detail",
    icon: getStandardViewIcon("detail"),
    isDefault: true,
    supports: STANDARD_DETAIL_SUPPORT,
    params: {
      usesDetailShell: true,
      ...(overrides.params ?? {}),
    },
    ...overrides,
  };
}

export function createStandardFeatureFlags(
  overrides: ModuleFeatureFlagMap = {},
): ModuleFeatureFlagMap {
  return {
    list: true,
    detail: false,
    notes: false,
    comments: false,
    tags: false,
    attachments: false,
    media: false,
    history: false,
    context: false,
    audit: false,
    grouped: false,
    timeline: false,
    calendar: false,
    kanban: false,
    gantt: false,
    graph: false,
    export: false,
    share: false,
    ...overrides,
  };
}
