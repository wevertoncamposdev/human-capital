"use client";

import { BarChart3, Table2 } from "lucide-react";
import type { Domain } from "@/web-client/domain/types";
import {
  createStandardDetailQueryState,
  createStandardDetailView,
  createStandardFeatureFlags,
  createStandardListQueryState,
  createStandardListView,
} from "@/web-client/starter";
import {
  defineRecordModule,
  type GraphBuilderState,
  type RecordModuleActionMap,
  type RecordModuleDefinition,
} from "@/web-client/registry/types";
import {
  peopleSegmentsDetailLayout,
  type PeopleSegmentsDetailLayoutContext,
} from "@/modules/people-segments/config/people-segments-detail-layout-contract";
import {
  peopleSegmentsDetailSearchView,
  peopleSegmentsSearchView,
} from "@/web-client/registry/searchViews/people-segments";

export type PeopleSegmentsListViewId = "table" | "graph";

export type PeopleSegmentsListQueryState = {
  view: PeopleSegmentsListViewId;
  searchText: string;
  domain: Domain;
  groupBy: string[];
  pageIndex: number;
  pageSize: number;
  graph: GraphBuilderState;
};

export type PeopleSegmentsDetailQueryState = {
  view: "detail";
  searchText: string;
  domain: Domain;
  groupBy: string[];
  pageIndex: number;
  pageSize: number;
};

export const PEOPLE_SEGMENTS_ROUTES = {
  list: "/people-groups",
  detail: "/people-groups",
} as const;

const PEOPLE_SEGMENTS_PERMISSIONS = {
  canRead: "people.read",
  canCreate: "people.create",
  canEdit: "people.update",
  canDelete: "people.delete",
  canAudit: "people.read",
  canExport: "people.read",
} as const;

const PEOPLE_SEGMENTS_LIST_ACTIONS: RecordModuleActionMap = {
  view: {
    key: "view",
    label: "Abrir grupo de pessoas",
    permissionKey: "canRead",
    scope: "row",
    requiresReturnTo: true,
  },
  create: {
    key: "create",
    label: "Novo",
    permissionKey: "canCreate",
    scope: "list",
  },
  refresh: {
    key: "refresh",
    label: "Atualizar",
    permissionKey: "canRead",
    scope: "list",
  },
};

const PEOPLE_SEGMENTS_DETAIL_ACTIONS: RecordModuleActionMap = {
  view: {
    key: "view",
    label: "Visualizar grupo de pessoas",
    permissionKey: "canRead",
    scope: "detail",
  },
  create: {
    key: "create",
    label: "Novo grupo de pessoas",
    permissionKey: "canCreate",
    scope: "detail",
  },
  edit: {
    key: "edit",
    label: "Salvar alteracoes",
    permissionKey: "canEdit",
    scope: "detail",
  },
  delete: {
    key: "delete",
    label: "Excluir grupo de pessoas",
    permissionKey: "canDelete",
    scope: "detail",
  },
  audit: {
    key: "audit",
    label: "Auditoria",
    permissionKey: "canAudit",
    scope: "detail",
  },
};

export const peopleSegmentsListModuleDefinition =
  defineRecordModule<PeopleSegmentsListQueryState>({
    moduleId: "people-segments.list",
    basePath: PEOPLE_SEGMENTS_ROUTES.list,
    featureFlags: createStandardFeatureFlags({
      detail: false,
      graph: true,
      export: true,
    }),
    actionKey: "people-segments.list.screen",
    favoriteKey: "people-segments.list.favorites",
    permissions: PEOPLE_SEGMENTS_PERMISSIONS,
    actions: PEOPLE_SEGMENTS_LIST_ACTIONS,
    queryAdapters: {
      listDataProvider: { model: "people-segments.list" },
      detailDataProvider: { model: "people-segments.detail" },
    },
    domainAdapter: {
      entity: { singular: "Grupo de Pessoas", plural: "Grupos de Pessoas" },
      list: {
        searchPlaceholder: "Pesquisar",
        createActionLabel: "Novo",
        totalLabel: "Total",
        emptyStateLabel: "Nenhum grupo de pessoas encontrado.",
      },
      detail: {
        fallbackTitle: "Grupo de Pessoas",
      },
      fields: {
        name: { label: "Grupo de Pessoas" },
        purpose: { label: "Finalidade" },
        groupType: { label: "Tipo do grupo" },
        category: { label: "Categoria" },
        createdAt: { label: "Cadastro" },
        ageMin: { label: "Idade mínima" },
        ageMax: { label: "Idade máxima" },
        isActive: { label: "Status" },
        description: { label: "Descrição" },
        internalNotes: { label: "Notas internas" },
      },
    },
    searchConfig: peopleSegmentsSearchView,
    views: [
      createStandardListView({
        id: "table",
        title: "Tabela",
        viewType: "table",
        icon: <Table2 className="size-4" />,
        params: {
          searchable: true,
          sortable: true,
          paginated: true,
          sortFields: ["name", "purpose", "category", "createdAt", "ageMin", "ageMax", "isActive"],
        },
      }),
      {
        id: "graph",
        title: "Gráfico",
        viewType: "graph",
        icon: <BarChart3 className="size-4" />,
        params: {
          builder: {
            fields: [
              { field: "category", label: "Categoria", kind: "dimension" },
              { field: "purpose", label: "Finalidade", kind: "dimension" },
              { field: "isActive", label: "Status", kind: "dimension" },
            ],
            defaultState: {
              groupBy: "purpose",
              metric: { field: null, op: "count" },
              timeField: null,
              timeBucket: null,
              chartType: "bar",
              filters: {},
            },
            maxGroups: 8,
            downloadFileName: "grupos-de-pessoas",
          },
        },
      },
    ],
    defaultQueryState: createStandardListQueryState<PeopleSegmentsListQueryState>({
      view: "table",
        graph: {
        groupBy: "purpose",
        metric: { field: null, op: "count" },
        timeField: null,
        timeBucket: null,
        chartType: "bar",
        filters: {},
      },
    }),
    defaultView: "table",
  });

export const peopleSegmentsDetailModuleDefinition =
  defineRecordModule<
    PeopleSegmentsDetailQueryState,
    PeopleSegmentsDetailLayoutContext
  >({
    moduleId: "people-segments.detail",
    basePath: PEOPLE_SEGMENTS_ROUTES.detail,
    featureFlags: createStandardFeatureFlags({
      list: false,
      detail: true,
      notes: true,
      history: true,
      context: true,
      audit: true,
    }),
    actionKey: "people-segments.detail.screen",
    favoriteKey: "people-segments.detail.favorites",
    permissions: PEOPLE_SEGMENTS_PERMISSIONS,
    actions: PEOPLE_SEGMENTS_DETAIL_ACTIONS,
    queryAdapters: {
      listDataProvider: { model: "people-segments.detail" },
      detailDataProvider: { model: "people-segments.detail" },
      auditDataProvider: { model: "audit.logs" },
    },
    domainAdapter: {
      entity: { singular: "Grupo de Pessoas", plural: "Grupos de Pessoas" },
      detail: {
        createTitle: "Novo grupo de pessoas",
        fallbackTitle: "Grupo de Pessoas",
      },
      fields: {
        name: { label: "Grupo de Pessoas" },
        purpose: { label: "Finalidade" },
        groupType: { label: "Tipo do grupo" },
        category: { label: "Categoria" },
        createdAt: { label: "Cadastro" },
        ageMin: { label: "Idade mínima" },
        ageMax: { label: "Idade máxima" },
        isActive: { label: "Status" },
        description: { label: "Descrição" },
        internalNotes: { label: "Notas internas" },
      },
    },
    searchConfig: peopleSegmentsDetailSearchView,
    views: [createStandardDetailView({ icon: <Table2 className="size-4" /> })],
    defaultQueryState: createStandardDetailQueryState<PeopleSegmentsDetailQueryState>(),
    defaultView: "detail",
    detailLayout: peopleSegmentsDetailLayout,
  });

export type PeopleSegmentsModuleDefinition =
  | RecordModuleDefinition<PeopleSegmentsListQueryState>
  | RecordModuleDefinition<
      PeopleSegmentsDetailQueryState,
      PeopleSegmentsDetailLayoutContext
    >;
