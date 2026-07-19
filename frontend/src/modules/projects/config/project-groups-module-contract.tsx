"use client";

import { BarChart3, LayoutGrid, Table2 } from "lucide-react";
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
import { projectGroupsSearchView } from "@/web-client/registry/searchViews/project-structure";
import {
  projectGroupsDetailLayout,
  type ProjectGroupsDetailLayoutContext,
} from "@/modules/projects/config/project-groups-detail-layout-contract";

export type ProjectGroupsListViewId = "table" | "kanban" | "graph";

export type ProjectGroupsListQueryState = {
  view: ProjectGroupsListViewId;
  searchText: string;
  domain: Domain;
  groupBy: string[];
  pageIndex: number;
  pageSize: number;
  graph: GraphBuilderState;
};

export type ProjectGroupsDetailQueryState = {
  view: "detail";
  searchText: string;
  domain: Domain;
  groupBy: string[];
  pageIndex: number;
  pageSize: number;
};

export const PROJECT_GROUPS_ROUTES = {
  list: "/projects/groups",
  detail: "/projects/groups",
} as const;

const PROJECT_GROUPS_PERMISSIONS = {
  canRead: "project-structure.read",
  canCreate: "project-structure.create",
  canEdit: "project-structure.update",
  canDelete: "project-structure.delete",
  canAudit: "project-structure.read",
} as const;

const PROJECT_GROUPS_LIST_ACTIONS: RecordModuleActionMap = {
  view: {
    key: "view",
    label: "Abrir grupo",
    permissionKey: "canRead",
    scope: "row",
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

const PROJECT_GROUPS_DETAIL_ACTIONS: RecordModuleActionMap = {
  view: {
    key: "view",
    label: "Visualizar grupo",
    permissionKey: "canRead",
    scope: "detail",
  },
  create: {
    key: "create",
    label: "Novo grupo",
    permissionKey: "canCreate",
    scope: "detail",
  },
  edit: {
    key: "edit",
    label: "Salvar alterações",
    permissionKey: "canEdit",
    scope: "detail",
  },
  delete: {
    key: "delete",
    label: "Excluir grupo",
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

export const projectGroupsListModuleDefinition =
  defineRecordModule<ProjectGroupsListQueryState>({
    moduleId: "project-groups.list",
    basePath: PROJECT_GROUPS_ROUTES.list,
    featureFlags: createStandardFeatureFlags({
      detail: false,
      kanban: true,
      graph: true,
      export: true,
    }),
    actionKey: "project-groups.list.screen",
    favoriteKey: "project-groups.list.favorites",
    permissions: PROJECT_GROUPS_PERMISSIONS,
    actions: PROJECT_GROUPS_LIST_ACTIONS,
    queryAdapters: {
      listDataProvider: { model: "project-groups.list" },
      detailDataProvider: { model: "project-groups.list" },
    },
    domainAdapter: {
      entity: {
        singular: "Grupo de Participantes",
        plural: "Grupos de Participantes",
      },
      list: {
        searchPlaceholder: "Pesquisar",
        createActionLabel: "Novo",
        totalLabel: "Total",
        emptyStateLabel: "Nenhum grupo encontrado.",
      },
      detail: {
        fallbackTitle: "Grupo de Participantes",
      },
      fields: {
        name: { label: "Grupo de Participantes" },
        description: { label: "Descrição" },
        "project.name": { label: "Projeto" },
        createdAt: { label: "Cadastro", type: "date" },
        "_count.memberships": { label: "Participantes", type: "number" },
        "_count.actions": { label: "Ações", type: "number" },
        internalNotes: { label: "Notas internas" },
        updatedAt: { label: "Atualizado em", type: "date" },
      },
    },
    searchConfig: projectGroupsSearchView,
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
          sortFields: [
            "name",
            "project.name",
            "createdAt",
            "_count.memberships",
            "_count.actions",
          ],
        },
      }),
      {
        id: "kanban",
        title: "Kanban",
        viewType: "kanban",
        icon: <LayoutGrid className="size-4" />,
        params: {
          columnField: "project.name",
          titleField: "name",
          groupByFields: ["project.name", "createdAt"],
          defaultGroupByField: "project.name",
        },
      },
      {
        id: "graph",
        title: "Gráfico",
        viewType: "graph",
        icon: <BarChart3 className="size-4" />,
        params: {
          builder: {
            fields: [
              { field: "project.name", label: "Projeto", kind: "dimension" },
              { field: "createdAt", label: "Cadastro", kind: "date" },
              {
                field: "_count.memberships",
                label: "Participantes",
                kind: "metric",
                allowedOps: ["sum", "avg", "count", "max", "min"],
              },
              {
                field: "_count.actions",
                label: "Ações",
                kind: "metric",
                allowedOps: ["sum", "avg", "count", "max", "min"],
              },
            ],
            defaultState: {
              groupBy: "project.name",
              metric: { field: "_count.memberships", op: "sum" },
              timeField: null,
              timeBucket: null,
              chartType: "bar",
              filters: {},
            },
            maxGroups: 12,
            downloadFileName: "grupos-de-participantes",
          },
        },
      },
    ],
    defaultQueryState: createStandardListQueryState<ProjectGroupsListQueryState>({
      view: "table",
      graph: {
        groupBy: "project.name",
        metric: { field: "_count.memberships", op: "sum" },
        timeField: null,
        timeBucket: null,
        chartType: "bar",
        filters: {},
      },
    }),
    defaultView: "table",
  });

export const projectGroupsDetailModuleDefinition =
  defineRecordModule<ProjectGroupsDetailQueryState, ProjectGroupsDetailLayoutContext>({
    moduleId: "project-groups.detail",
    basePath: PROJECT_GROUPS_ROUTES.detail,
    featureFlags: createStandardFeatureFlags({
      list: false,
      detail: true,
      notes: true,
      audit: true,
      history: true,
      context: true,
    }),
    actionKey: "project-groups.detail.screen",
    favoriteKey: "project-groups.detail.favorites",
    permissions: PROJECT_GROUPS_PERMISSIONS,
    actions: PROJECT_GROUPS_DETAIL_ACTIONS,
    queryAdapters: {
      listDataProvider: { model: "project-groups.list" },
      detailDataProvider: { model: "project-groups.list" },
      auditDataProvider: { model: "audit.logs" },
    },
    domainAdapter: {
      entity: {
        singular: "Grupo de Participantes",
        plural: "Grupos de Participantes",
      },
      detail: {
        createTitle: "Novo grupo de participantes",
        fallbackTitle: "Grupo de Participantes",
      },
      fields: {
        name: { label: "Grupo de Participantes" },
        description: { label: "Descrição" },
        internalNotes: { label: "Notas internas" },
      },
    },
    searchConfig: projectGroupsSearchView,
    views: [createStandardDetailView({ icon: <Table2 className="size-4" /> })],
    defaultQueryState: createStandardDetailQueryState<ProjectGroupsDetailQueryState>(),
    defaultView: "detail",
    detailLayout: projectGroupsDetailLayout,
  });

export type ProjectGroupsModuleDefinition =
  | RecordModuleDefinition<ProjectGroupsListQueryState>
  | RecordModuleDefinition<
      ProjectGroupsDetailQueryState,
      ProjectGroupsDetailLayoutContext
    >;
