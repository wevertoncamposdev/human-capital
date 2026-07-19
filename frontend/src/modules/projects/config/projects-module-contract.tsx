"use client";

import {
  BarChart3,
  CalendarDays,
  Clock3,
  LayoutGrid,
  Table2,
} from "lucide-react";
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
  type CalendarMode,
  type GanttScale,
  type GraphBuilderState,
  type RecordModuleActionMap,
  type RecordModuleDefinition,
  type SortDirection,
} from "@/web-client/registry/types";
import {
  projectsDetailLayout,
  type ProjectsDetailLayoutContext,
} from "@/modules/projects/config/projects-detail-layout-contract";
import {
  projectsDetailSearchView,
  projectsSearchView,
} from "@/web-client/registry/searchViews/projects";

export type ProjectsListViewId =
  | "table"
  | "kanban"
  | "timeline"
  | "calendar"
  | "gantt"
  | "graph";

export type ProjectsListQueryState = {
  view: ProjectsListViewId;
  searchText: string;
  domain: Domain;
  groupBy: string[];
  pageIndex: number;
  pageSize: number;
  timelineField: "startsAt" | "endsAt";
  timelineSortDirection: SortDirection;
  calendarField: "startsAt" | "endsAt";
  calendarMode: CalendarMode;
  ganttScale: GanttScale;
  rangeFrom: string;
  rangeTo: string;
  graph: GraphBuilderState;
};

export type ProjectsDetailQueryState = {
  view: "detail";
  searchText: string;
  domain: Domain;
  groupBy: string[];
  pageIndex: number;
  pageSize: number;
};

export const PROJECTS_ROUTES = {
  list: "/projects",
  detail: "/projects",
} as const;

const PROJECTS_PERMISSIONS = {
  canRead: "projects.read",
  canCreate: "projects.create",
  canEdit: "projects.update",
  canDelete: "projects.delete",
  canAudit: "projects.read",
  canExport: "projects.read",
} as const;

const PROJECTS_LIST_ACTIONS: RecordModuleActionMap = {
  view: {
    key: "view",
    label: "Abrir projeto",
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

const PROJECTS_DETAIL_ACTIONS: RecordModuleActionMap = {
  view: {
    key: "view",
    label: "Visualizar projeto",
    permissionKey: "canRead",
    scope: "detail",
  },
  create: {
    key: "create",
    label: "Novo projeto",
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
    label: "Excluir projeto",
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

export const projectsListModuleDefinition = defineRecordModule<ProjectsListQueryState>({
  moduleId: "projects.list",
  basePath: PROJECTS_ROUTES.list,
  featureFlags: createStandardFeatureFlags({
    detail: false,
    kanban: true,
    timeline: true,
    calendar: true,
    gantt: true,
    graph: true,
    export: true,
  }),
  actionKey: "projects.list.screen",
  favoriteKey: "projects.list.favorites",
  permissions: PROJECTS_PERMISSIONS,
  actions: PROJECTS_LIST_ACTIONS,
  queryAdapters: {
    listDataProvider: { model: "projects.list" },
    detailDataProvider: { model: "projects.detail" },
  },
  domainAdapter: {
    entity: { singular: "Projeto", plural: "Projetos" },
    list: {
      searchPlaceholder: "Pesquisar",
      createActionLabel: "Novo",
      totalLabel: "Total",
      emptyStateLabel: "Nenhum projeto encontrado.",
    },
    detail: {
      fallbackTitle: "Projeto",
    },
    fields: {
      name: { label: "Projeto" },
      programId: { label: "Programa" },
      status: { label: "Status" },
      tags: { label: "Tags" },
      createdAt: { label: "Cadastro", type: "date" },
      description: { label: "Descrição" },
      internalNotes: { label: "Notas internas" },
      startsAt: { label: "Início", type: "date" },
      endsAt: { label: "Fim", type: "date" },
      "program.name": { label: "Programa" },
      "program.type": { label: "Tipo do programa" },
      "program.status": { label: "Status do programa" },
    },
  },
  searchConfig: projectsSearchView,
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
        sortFields: ["name", "status", "program.name", "program.type", "startsAt", "endsAt"],
      },
    }),
    {
      id: "kanban",
      title: "Kanban",
      viewType: "kanban",
      icon: <LayoutGrid className="size-4" />,
      params: {
        columnField: "status",
        titleField: "name",
        groupByFields: ["status", "program.name", "program.type", "tags", "createdAt"],
        defaultGroupByField: "status",
      },
    },
    {
      id: "timeline",
      title: "Timeline",
      viewType: "timeline",
      icon: <Clock3 className="size-4" />,
      params: {
        startDateField: "startsAt",
        endDateField: "endsAt",
        titleField: "name",
        dateFields: ["startsAt", "endsAt"],
        defaultDateField: "startsAt",
        sortDirections: ["desc", "asc"],
        defaultSortDirection: "desc",
      },
    },
    {
      id: "calendar",
      title: "Calendário",
      viewType: "calendar",
      icon: <CalendarDays className="size-4" />,
      params: {
        startDateField: "startsAt",
        endDateField: "endsAt",
        titleField: "name",
        dateFields: ["startsAt", "endsAt"],
        defaultDateField: "startsAt",
        modes: ["day", "week", "month", "year"],
        defaultMode: "month",
      },
    },
    {
      id: "gantt",
      title: "Gantt",
      viewType: "gantt",
      params: {
        startDateField: "startsAt",
        endDateField: "endsAt",
        titleField: "name",
        groupByFields: ["status", "program.name", "program.type", "tags", "createdAt"],
        defaultGroupByField: "status",
        scaleOptions: ["week", "month", "quarter"],
        defaultScale: "month",
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
            { field: "status", label: "Status", kind: "dimension" },
            { field: "program.name", label: "Programa", kind: "dimension" },
            { field: "program.type", label: "Tipo do programa", kind: "dimension" },
            { field: "startsAt", label: "Inicio", kind: "date" },
            { field: "endsAt", label: "Fim", kind: "date" },
          ],
          defaultState: {
            groupBy: "status",
            metric: { field: null, op: "count" },
            timeField: null,
            timeBucket: null,
            chartType: "bar",
            filters: {},
          },
          maxGroups: 8,
          downloadFileName: "projetos",
        },
      },
    },
  ],
  defaultQueryState: createStandardListQueryState<ProjectsListQueryState>({
    view: "table",
    timelineField: "startsAt",
    timelineSortDirection: "desc",
    calendarField: "startsAt",
    calendarMode: "month",
    ganttScale: "month",
    rangeFrom: "",
    rangeTo: "",
    graph: {
      groupBy: "status",
      metric: { field: null, op: "count" },
      timeField: null,
      timeBucket: null,
      chartType: "bar",
      filters: {},
    },
  }),
  defaultView: "table",
});

export const projectsDetailModuleDefinition =
  defineRecordModule<ProjectsDetailQueryState, ProjectsDetailLayoutContext>({
    moduleId: "projects.detail",
    basePath: PROJECTS_ROUTES.detail,
    featureFlags: createStandardFeatureFlags({
      list: false,
      detail: true,
      comments: true,
      notes: true,
      tags: true,
      attachments: true,
      audit: true,
      history: true,
      context: true,
    }),
    actionKey: "projects.detail.screen",
    favoriteKey: "projects.detail.favorites",
    permissions: PROJECTS_PERMISSIONS,
    actions: PROJECTS_DETAIL_ACTIONS,
    queryAdapters: {
      listDataProvider: { model: "projects.detail" },
      detailDataProvider: { model: "projects.detail" },
      auditDataProvider: { model: "audit.logs" },
    },
    domainAdapter: {
      entity: { singular: "Projeto", plural: "Projetos" },
      detail: {
        createTitle: "Novo projeto",
        fallbackTitle: "Projeto",
      },
      fields: {
        programId: { label: "Programa" },
        name: { label: "Projeto" },
        status: { label: "Status" },
        description: { label: "Descrição" },
        tags: { label: "Tags" },
        internalNotes: { label: "Notas internas" },
        startsAt: { label: "Início", type: "date" },
        endsAt: { label: "Fim", type: "date" },
      },
    },
    searchConfig: projectsDetailSearchView,
    views: [createStandardDetailView({ icon: <Table2 className="size-4" /> })],
    defaultQueryState: createStandardDetailQueryState<ProjectsDetailQueryState>(),
    defaultView: "detail",
    detailLayout: projectsDetailLayout,
  });

export type ProjectsModuleDefinition =
  | RecordModuleDefinition<ProjectsListQueryState>
  | RecordModuleDefinition<ProjectsDetailQueryState, ProjectsDetailLayoutContext>;
