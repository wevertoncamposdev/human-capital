"use client";

import {
  BarChart3,
  CalendarDays,
  Clock3,
  LayoutGrid,
  Table2,
} from "lucide-react";
import {
  actionsDetailLayout,
  type ActionsDetailLayoutContext,
} from "@/modules/actions/config/actions-detail-layout-contract";
import { ACTION_STATUS_LABELS } from "@/modules/actions/shared/domain/actions.constants";
import type { Domain } from "@/web-client/domain/types";
import {
  actionsDetailSearchView,
  actionsSearchView,
} from "@/web-client/registry/searchViews/actions";
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

export type ActionsListViewId =
  | "table"
  | "kanban"
  | "timeline"
  | "calendar"
  | "gantt"
  | "graph";

export type ActionDateField =
  | "plannedStartAt"
  | "plannedEndAt"
  | "executedStartAt"
  | "executedEndAt";

export type ActionsListQueryState = {
  view: ActionsListViewId;
  searchText: string;
  domain: Domain;
  groupBy: string[];
  pageIndex: number;
  pageSize: number;
  timelineField: ActionDateField;
  timelineSortDirection: SortDirection;
  calendarField: ActionDateField;
  calendarMode: CalendarMode;
  ganttScale: GanttScale;
  rangeFrom: string;
  rangeTo: string;
  graph: GraphBuilderState;
};

export type ActionsDetailQueryState = {
  view: "detail";
  searchText: string;
  domain: Domain;
  groupBy: string[];
  pageIndex: number;
  pageSize: number;
};

export const ACTIONS_ROUTES = {
  list: "/actions",
  detail: "/actions",
} as const;

const ACTIONS_PERMISSIONS = {
  canRead: "actions.read",
  canCreate: "actions.create",
  canEdit: "actions.update",
  canDelete: "actions.delete",
} as const;

const ACTIONS_LIST_ACTIONS: RecordModuleActionMap = {
  view: {
    key: "view",
    label: "Abrir ação",
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

const ACTIONS_DETAIL_ACTIONS: RecordModuleActionMap = {
  view: {
    key: "view",
    label: "Visualizar ação",
    permissionKey: "canRead",
    scope: "detail",
  },
  create: {
    key: "create",
    label: "Nova acao",
    permissionKey: "canCreate",
    scope: "detail",
  },
  audit: {
    key: "audit",
    label: "Auditoria",
    permissionKey: "canRead",
    scope: "detail",
  },
};

export const actionsListModuleDefinition = defineRecordModule<ActionsListQueryState>({
  moduleId: "actions.list",
  basePath: ACTIONS_ROUTES.list,
  featureFlags: createStandardFeatureFlags({
    list: true,
    detail: false,
    kanban: true,
    timeline: true,
    calendar: true,
    gantt: true,
    graph: true,
  }),
  actionKey: "actions.list.screen",
  favoriteKey: "actions.list.favorites",
  permissions: ACTIONS_PERMISSIONS,
  actions: ACTIONS_LIST_ACTIONS,
  queryAdapters: {
    listDataProvider: { model: "actions.list" },
  },
  domainAdapter: {
    entity: { singular: "Ação", plural: "Ações" },
    list: {
      searchPlaceholder: "Pesquisar ações",
      createActionLabel: "Novo",
      totalLabel: "Total",
      emptyStateLabel: "Nenhuma ação encontrada.",
    },
    detail: {
      fallbackTitle: "Ação",
    },
    fields: {
      title: { label: "Ação" },
      tags: { label: "Tags" },
      createdAt: { label: "Cadastro", type: "date" },
      status: { label: "Status" },
      "actionType.name": { label: "Tipo" },
      "project.name": { label: "Projeto" },
      "projectGroup.name": { label: "Grupo de Participantes" },
      "peopleGroup.name": { label: "Grupo de Pessoas" },
      "targetEnrollment.person.fullName": { label: "Participante" },
      plannedStartAt: { label: "Início planejado", type: "date" },
      plannedEndAt: { label: "Fim planejado", type: "date" },
      executedStartAt: { label: "Início executado", type: "date" },
      executedEndAt: { label: "Fim executado", type: "date" },
      completionPercent: { label: "Conclusão", type: "number" },
    },
  },
  searchConfig: actionsSearchView,
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
          "title",
          "status",
          "createdAt",
          "plannedStartAt",
          "plannedEndAt",
          "executedStartAt",
          "executedEndAt",
        ],
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
        groupByFields: [
          "status",
          "actionType.name",
          "project.name",
          "projectGroup.name",
          "peopleGroup.name",
          "targetEnrollment.person.fullName",
          "tags",
        ],
        defaultGroupByField: "status",
      },
    },
    {
      id: "timeline",
      title: "Timeline",
      viewType: "timeline",
      icon: <Clock3 className="size-4" />,
      params: {
        startDateField: "plannedStartAt",
        endDateField: "plannedEndAt",
        titleField: "title",
        dateFields: [
          "plannedStartAt",
          "plannedEndAt",
          "executedStartAt",
          "executedEndAt",
        ],
        defaultDateField: "plannedStartAt",
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
        startDateField: "plannedStartAt",
        titleField: "title",
        dateFields: [
          "plannedStartAt",
          "plannedEndAt",
          "executedStartAt",
          "executedEndAt",
        ],
        defaultDateField: "plannedStartAt",
        modes: ["day", "week", "month", "year"],
        defaultMode: "month",
      },
    },
    {
      id: "gantt",
      title: "Gantt",
      viewType: "gantt",
      params: {
        startDateField: "plannedStartAt",
        endDateField: "plannedEndAt",
        titleField: "title",
        progressField: "completionPercent",
        groupByFields: [
          "status",
          "actionType.name",
          "project.name",
          "projectGroup.name",
          "peopleGroup.name",
          "targetEnrollment.person.fullName",
          "tags",
          "createdAt",
        ],
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
            {
              field: "status",
              label: "Status",
              kind: "dimension",
              formatValue: (value) =>
                ACTION_STATUS_LABELS[value as keyof typeof ACTION_STATUS_LABELS] ??
                String(value ?? "Sem valor"),
            },
            {
              field: "actionType.name",
              label: "Tipo",
              kind: "dimension",
              getValue: (row) =>
                (row as {
                  actionType?: { name?: string | null } | null;
                }).actionType?.name ?? null,
            },
            {
              field: "project.name",
              label: "Projeto",
              kind: "dimension",
              getValue: (row) =>
                (row as {
                  project?: { name?: string | null } | null;
                }).project?.name ?? null,
            },
            {
              field: "projectGroup.name",
              label: "Grupo de Participantes",
              kind: "dimension",
              getValue: (row) =>
                (row as {
                  projectGroup?: { name?: string | null } | null;
                }).projectGroup?.name ?? null,
            },
            {
              field: "peopleGroup.name",
              label: "Grupo de Pessoas",
              kind: "dimension",
              getValue: (row) => {
                const record = row as {
                  peopleGroup?:
                    | {
                        name?: string | null;
                      }
                    | null;
                };
                return record.peopleGroup?.name ?? null;
              },
            },
            {
              field: "targetEnrollment.person.fullName",
              label: "Participante",
              kind: "dimension",
              getValue: (row) =>
                (row as {
                  targetEnrollment?: {
                    person?: { fullName?: string | null } | null;
                  } | null;
                }).targetEnrollment?.person?.fullName ?? null,
            },
            { field: "tags", label: "Tags", kind: "dimension", emptyValueLabel: "Sem tags" },
            { field: "createdAt", label: "Cadastro", kind: "date" },
            { field: "plannedStartAt", label: "Início planejado", kind: "date" },
            { field: "plannedEndAt", label: "Fim planejado", kind: "date" },
            { field: "executedStartAt", label: "Início executado", kind: "date" },
            { field: "executedEndAt", label: "Fim executado", kind: "date" },
            { field: "completionPercent", label: "Conclusão", kind: "metric" },
          ],
          defaultState: {
            groupBy: "status",
            metric: { field: null, op: "count" },
            timeField: null,
            timeBucket: null,
            chartType: "bar",
            filters: {},
          },
          maxGroups: 10,
          downloadFileName: "acoes",
        },
      },
    },
  ],
  defaultQueryState: createStandardListQueryState<ActionsListQueryState>({
    view: "table",
    timelineField: "plannedStartAt",
    timelineSortDirection: "desc",
    calendarField: "plannedStartAt",
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

export const actionsDetailModuleDefinition = defineRecordModule<
  ActionsDetailQueryState,
  ActionsDetailLayoutContext
>({
  moduleId: "actions.detail",
  basePath: ACTIONS_ROUTES.detail,
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
  actionKey: "actions.detail.screen",
  favoriteKey: "actions.detail.favorites",
  permissions: ACTIONS_PERMISSIONS,
  actions: ACTIONS_DETAIL_ACTIONS,
  queryAdapters: {
    listDataProvider: { model: "actions.list" },
    auditDataProvider: { model: "audit.logs" },
  },
  domainAdapter: {
    entity: { singular: "Ação", plural: "Ações" },
    detail: {
      fallbackTitle: "Ação",
    },
    fields: {
      title: { label: "Ação" },
      tags: { label: "Tags" },
      createdAt: { label: "Cadastro", type: "date" },
      status: { label: "Status" },
      internalNotes: { label: "Notas internas" },
      plannedStartAt: { label: "Início planejado", type: "date" },
      plannedEndAt: { label: "Fim planejado", type: "date" },
    },
  },
  searchConfig: actionsDetailSearchView,
  views: [createStandardDetailView({ icon: <Table2 className="size-4" /> })],
  defaultQueryState: createStandardDetailQueryState<ActionsDetailQueryState>(),
  defaultView: "detail",
  detailLayout: actionsDetailLayout,
});

export type ActionsModuleDefinition =
  | RecordModuleDefinition<ActionsListQueryState>
  | RecordModuleDefinition<ActionsDetailQueryState>;
