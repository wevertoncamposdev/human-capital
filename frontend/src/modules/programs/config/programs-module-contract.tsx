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
  programsDetailLayout,
  type ProgramsDetailLayoutContext,
} from "@/modules/programs/config/programs-detail-layout-contract";
import {
  programsDetailSearchView,
  programsSearchView,
} from "@/web-client/registry/searchViews/programs";

export type ProgramsListViewId =
  | "table"
  | "kanban"
  | "timeline"
  | "calendar"
  | "gantt"
  | "graph";

export type ProgramsListQueryState = {
  view: ProgramsListViewId;
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

export type ProgramsDetailQueryState = {
  view: "detail";
  searchText: string;
  domain: Domain;
  groupBy: string[];
  pageIndex: number;
  pageSize: number;
};

export const PROGRAMS_ROUTES = {
  list: "/programs",
  detail: "/programs",
} as const;

const PROGRAMS_PERMISSIONS = {
  canRead: "programs.read",
  canCreate: "programs.create",
  canEdit: "programs.update",
  canDelete: "programs.delete",
  canAudit: "programs.read",
  canExport: "programs.read",
} as const;

const PROGRAMS_LIST_ACTIONS: RecordModuleActionMap = {
  view: {
    key: "view",
    label: "Abrir programa",
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

const PROGRAMS_DETAIL_ACTIONS: RecordModuleActionMap = {
  view: {
    key: "view",
    label: "Visualizar programa",
    permissionKey: "canRead",
    scope: "detail",
  },
  create: {
    key: "create",
    label: "Novo programa",
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
    label: "Excluir programa",
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

export const programsListModuleDefinition = defineRecordModule<ProgramsListQueryState>({
  moduleId: "programs.list",
  basePath: PROGRAMS_ROUTES.list,
  featureFlags: createStandardFeatureFlags({
    detail: false,
    kanban: true,
    timeline: true,
    calendar: true,
    gantt: true,
    graph: true,
    export: true,
  }),
  actionKey: "programs.list.screen",
  favoriteKey: "programs.list.favorites",
  permissions: PROGRAMS_PERMISSIONS,
  actions: PROGRAMS_LIST_ACTIONS,
  queryAdapters: {
    listDataProvider: { model: "programs.list" },
    detailDataProvider: { model: "programs.detail" },
  },
  domainAdapter: {
    entity: { singular: "Programa", plural: "Programas" },
    list: {
      searchPlaceholder: "Pesquisar programas",
      createActionLabel: "Novo",
      totalLabel: "Total",
      emptyStateLabel: "Nenhum programa encontrado.",
    },
    detail: {
      fallbackTitle: "Programa",
    },
    fields: {
      name: { label: "Programa" },
      type: { label: "Tipo" },
      status: { label: "Status" },
      description: { label: "Descrição" },
      tags: { label: "Tags" },
      internalNotes: { label: "Notas internas" },
      startsAt: { label: "Início", type: "date" },
      endsAt: { label: "Fim", type: "date" },
      createdAt: { label: "Criado em", type: "date" },
      updatedAt: { label: "Atualizado em", type: "date" },
    },
  },
  searchConfig: programsSearchView,
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
        sortFields: ["name", "status", "type", "startsAt", "endsAt", "updatedAt"],
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
        groupByFields: ["status", "type", "tags", "createdAt"],
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
        groupByFields: ["status", "type", "tags", "createdAt"],
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
            { field: "type", label: "Tipo", kind: "dimension" },
            { field: "startsAt", label: "Início", kind: "date" },
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
          downloadFileName: "programas",
        },
      },
    },
  ],
  defaultQueryState: createStandardListQueryState<ProgramsListQueryState>({
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

export const programsDetailModuleDefinition =
  defineRecordModule<ProgramsDetailQueryState, ProgramsDetailLayoutContext>({
    moduleId: "programs.detail",
    basePath: PROGRAMS_ROUTES.detail,
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
    actionKey: "programs.detail.screen",
    favoriteKey: "programs.detail.favorites",
    permissions: PROGRAMS_PERMISSIONS,
    actions: PROGRAMS_DETAIL_ACTIONS,
    queryAdapters: {
      listDataProvider: { model: "programs.detail" },
      detailDataProvider: { model: "programs.detail" },
      auditDataProvider: { model: "audit.logs" },
    },
    domainAdapter: {
      entity: { singular: "Programa", plural: "Programas" },
      detail: {
        createTitle: "Novo programa",
        fallbackTitle: "Programa",
      },
      fields: {
        name: { label: "Programa" },
        type: { label: "Tipo" },
        status: { label: "Status" },
        description: { label: "Descrição" },
        tags: { label: "Tags" },
        internalNotes: { label: "Notas internas" },
        startsAt: { label: "Início", type: "date" },
        endsAt: { label: "Fim", type: "date" },
        createdAt: { label: "Criado em", type: "date" },
        updatedAt: { label: "Atualizado em", type: "date" },
      },
    },
    searchConfig: programsDetailSearchView,
    views: [createStandardDetailView({ icon: <Table2 className="size-4" /> })],
    defaultQueryState: createStandardDetailQueryState<ProgramsDetailQueryState>(),
    defaultView: "detail",
    detailLayout: programsDetailLayout,
  });

export type ProgramsModuleDefinition =
  | RecordModuleDefinition<ProgramsListQueryState>
  | RecordModuleDefinition<ProgramsDetailQueryState, ProgramsDetailLayoutContext>;
