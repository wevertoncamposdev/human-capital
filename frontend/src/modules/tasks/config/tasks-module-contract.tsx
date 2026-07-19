"use client";

import * as React from "react";
import {
  BarChart3,
  CalendarDays,
  Clock3,
  LayoutGrid,
  Table2,
} from "lucide-react";
import type { Domain } from "@/web-client/domain/types";
import { tasksSearchView } from "@/web-client/registry/searchViews/tasks";
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
  createStandardDetailQueryState,
  createStandardDetailView,
  createStandardFeatureFlags,
  createStandardListQueryState,
  createStandardListView,
} from "@/web-client/starter";
import {
  TASK_AUDIT_FIELD_LABELS,
  TASK_KIND_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
} from "@/modules/tasks/shared/domain/tasks.constants";
import { tasksDetailLayout, type TasksDetailLayoutContext } from "@/modules/tasks/config/tasks-detail-layout-contract";

export type TasksListViewId = "list" | "kanban" | "timeline" | "calendar" | "gantt" | "graph";

export type TasksListQueryState = {
  view: TasksListViewId;
  searchText: string;
  domain: Domain;
  groupBy: string[];
  pageIndex: number;
  pageSize: number;
  timelineField: "dueDate" | "startDate";
  timelineSortDirection: SortDirection;
  calendarField: "dueDate" | "startDate";
  calendarMode: CalendarMode;
  ganttScale: GanttScale;
  rangeFrom: string;
  rangeTo: string;
  graph: GraphBuilderState;
};

export type TasksDetailQueryState = {
  view: "detail";
  searchText: string;
  domain: Domain;
  groupBy: string[];
  pageIndex: number;
  pageSize: number;
};

export const TASKS_ROUTES = {
  list: "/tasks",
  detail: "/tasks",
} as const;

const TASKS_PERMISSIONS = {
  canRead: "tasks.read",
  canCreate: "tasks.create",
  canEdit: "tasks.update",
  canDelete: "tasks.delete",
  canAudit: "tasks.read",
  canShare: "tasks.read",
  canExport: "tasks.read",
} as const;

const TASKS_ACTIONS_LIST: RecordModuleActionMap = {
  view: {
    key: "view",
    label: "Abrir tarefa",
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

const TASKS_ACTIONS_DETAIL: RecordModuleActionMap = {
  view: {
    key: "view",
    label: "Visualizar tarefa",
    permissionKey: "canRead",
    scope: "detail",
  },
  create: {
    key: "create",
    label: "Nova tarefa",
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
    label: "Excluir tarefa",
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

const TASK_FIELD_MAP = {
  title: { label: "Titulo", placeholder: "Titulo da tarefa" },
  summary: { label: "Resumo", placeholder: "Resumo curto" },
  description: { label: "Descricao", type: "textarea" },
  status: { label: "Status" },
  priority: { label: "Prioridade" },
  kind: { label: "Tipo" },
  owner: { label: "Responsavel" },
  team: { label: "Time" },
  startDate: { label: "Inicio", type: "date" },
  dueDate: { label: "Entrega", type: "date" },
  isMilestone: { label: "Marco", type: "boolean" },
  dueState: { label: "Prazo" },
  progress: { label: "Progresso", type: "number" },
  effortPoints: { label: "Pontos", type: "number" },
  tags: { label: "Tags" },
  internalNotes: { label: "Notas internas" },
  ...Object.fromEntries(
    Object.entries(TASK_AUDIT_FIELD_LABELS).map(([field, label]) => [field, { label }]),
  ),
};

export const tasksListModuleDefinition = defineRecordModule<TasksListQueryState>({
  moduleId: "tasks.list",
  basePath: TASKS_ROUTES.list,
  featureFlags: createStandardFeatureFlags({
    list: true,
    detail: false,
    kanban: true,
    timeline: true,
    calendar: true,
    gantt: true,
    graph: true,
  }),
  actionKey: "tasks.list.screen",
  favoriteKey: "tasks.list.favorites",
  permissions: TASKS_PERMISSIONS,
  actions: TASKS_ACTIONS_LIST,
  queryAdapters: {
    listDataProvider: { model: "tasks.list" },
    detailDataProvider: { model: "tasks.detail" },
  },
  domainAdapter: {
    entity: { singular: "Tarefa", plural: "Tarefas" },
    list: {
      searchPlaceholder: "Pesquisar tarefas",
      createActionLabel: "Novo",
      totalLabel: "Total",
      emptyStateLabel: "Nenhuma tarefa encontrada.",
    },
    fields: TASK_FIELD_MAP,
    validations: {
      title: { required: true, minLength: 3 },
    },
    displayFallbacks: {
      emptyText: "-",
      emptyDate: "Sem data",
      emptyNumber: "0",
      emptyRelation: "Sem vinculo",
    },
  },
  searchConfig: tasksSearchView,
  views: [
    createStandardListView({
      params: {
        searchable: true,
        sortable: true,
        paginated: true,
        sortFields: ["title", "status", "priority", "dueDate", "updatedAt"],
      },
    }),
    {
      id: "kanban",
      title: "Kanban",
      viewType: "kanban",
      icon: <LayoutGrid className="size-4" />,
      params: {
        columnField: "status",
        titleField: "title",
        groupByFields: ["status", "priority", "kind", "owner", "team", "dueState"],
        defaultGroupByField: "status",
      },
    },
    {
      id: "timeline",
      title: "Timeline",
      viewType: "timeline",
      icon: <Clock3 className="size-4" />,
      params: {
        startDateField: "dueDate",
        titleField: "title",
        dateFields: ["dueDate", "startDate"],
        defaultDateField: "dueDate",
        sortDirections: ["desc", "asc"],
        defaultSortDirection: "desc",
      },
    },
    {
      id: "calendar",
      title: "Calendario",
      viewType: "calendar",
      icon: <CalendarDays className="size-4" />,
      params: {
        startDateField: "dueDate",
        titleField: "title",
        dateFields: ["dueDate", "startDate"],
        defaultDateField: "dueDate",
        modes: ["day", "week", "month", "year"],
        defaultMode: "month",
      },
    },
    {
      id: "gantt",
      title: "Gantt",
      viewType: "gantt",
      params: {
        startDateField: "startDate",
        endDateField: "dueDate",
        titleField: "title",
        progressField: "progress",
        groupByFields: ["status", "priority", "kind", "owner", "team", "dueState", "isMilestone", "tags"],
        defaultGroupByField: "status",
        scaleOptions: ["week", "month", "quarter"],
        defaultScale: "month",
      },
    },
    {
      id: "graph",
      title: "Grafico",
      viewType: "graph",
      icon: <BarChart3 className="size-4" />,
      params: {
        builder: {
          fields: [
            { field: "status", label: "Status", kind: "dimension" },
            { field: "priority", label: "Prioridade", kind: "dimension" },
            { field: "owner", label: "Responsavel", kind: "dimension", emptyValueLabel: "Sem responsavel" },
            { field: "team", label: "Time", kind: "dimension", emptyValueLabel: "Sem time" },
            { field: "dueState", label: "Prazo", kind: "dimension" },
            { field: "isMilestone", label: "Marco", kind: "dimension", formatValue: (value) => (value ? "Marco" : "Tarefa") },
            { field: "kind", label: "Tipo", kind: "dimension" },
            { field: "tags", label: "Tags", kind: "dimension", emptyValueLabel: "Sem tags" },
            { field: "startDate", label: "Inicio", kind: "date" },
            { field: "dueDate", label: "Entrega", kind: "date" },
            { field: "progress", label: "Progresso", kind: "metric" },
            { field: "effortPoints", label: "Pontos", kind: "metric" },
          ],
          defaultState: {
            groupBy: "status",
            metric: {
              field: "progress",
              op: "count",
            },
            timeField: null,
            timeBucket: null,
            chartType: "bar",
            filters: {},
          },
          maxGroups: 8,
          downloadFileName: "tarefas",
        },
      },
    },
  ],
  defaultView: "list",
  defaultQueryState: createStandardListQueryState<TasksListQueryState>({
    pageSize: 12,
    timelineField: "dueDate",
    timelineSortDirection: "desc",
    calendarField: "dueDate",
    calendarMode: "month",
    ganttScale: "month",
    rangeFrom: "",
    rangeTo: "",
    graph: {
      groupBy: "status",
      metric: {
        field: "progress",
        op: "count",
      },
      timeField: null,
      timeBucket: null,
      chartType: "bar",
      filters: {},
    },
  }),
});

export const tasksDetailModuleDefinition = defineRecordModule<
  TasksDetailQueryState,
  TasksDetailLayoutContext
>({
  moduleId: "tasks.detail",
  basePath: TASKS_ROUTES.detail,
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
  actionKey: "tasks.detail.screen",
  favoriteKey: "tasks.detail.favorites",
  permissions: TASKS_PERMISSIONS,
  actions: TASKS_ACTIONS_DETAIL,
  queryAdapters: {
    listDataProvider: { model: "tasks.list" },
    detailDataProvider: { model: "tasks.detail" },
    auditDataProvider: { model: "tasks.audit" },
  },
  domainAdapter: {
    entity: { singular: "Tarefa", plural: "Tarefas" },
    detail: {
      createTitle: "Novo",
      fallbackTitle: "Tarefa",
    },
    fields: TASK_FIELD_MAP,
    validations: {
      title: { required: true, minLength: 3 },
    },
    displayFallbacks: {
      emptyText: "-",
      emptyDate: "Sem data",
      emptyNumber: "0",
      emptyRelation: "Sem vinculo",
    },
  },
  searchConfig: tasksSearchView,
  views: [createStandardDetailView({ icon: <Table2 className="size-4" /> })],
  defaultView: "detail",
  defaultQueryState: createStandardDetailQueryState<TasksDetailQueryState>(),
  detailLayout: tasksDetailLayout,
});

export const TASKS_METADATA = {
  statuses: TASK_STATUS_OPTIONS,
  priorities: TASK_PRIORITY_OPTIONS,
  kinds: TASK_KIND_OPTIONS,
} as const;

export type TasksModuleDefinition =
  | RecordModuleDefinition<TasksListQueryState>
  | RecordModuleDefinition<TasksDetailQueryState, TasksDetailLayoutContext>;
