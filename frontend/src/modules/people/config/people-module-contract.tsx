"use client";

import * as React from "react";
import { BarChart3, CalendarDays, Clock3, LayoutGrid } from "lucide-react";
import type { Domain } from "@/web-client/domain/types";
import { peopleSearchView } from "@/web-client/registry/searchViews/people";
import {
  type CalendarMode,
  defineRecordModule,
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
import type { PeopleDetailLayoutContext } from "@/modules/people/config/people-detail-layout-contract";
import {
  PEOPLE_AUDIT_FIELD_LABELS,
  peopleDetailLayout,
} from "@/modules/people/config/people-detail-layout-contract";

export type PeopleListViewId = "list" | "kanban" | "timeline" | "calendar" | "graph";

export type PeopleListQueryState = {
  view: PeopleListViewId;
  searchText: string;
  domain: Domain;
  groupBy: string[];
  pageIndex: number;
  pageSize: number;
  timelineField: string;
  timelineSortDirection: SortDirection;
  calendarField: string;
  calendarMode: CalendarMode;
  rangeFrom: string;
  rangeTo: string;
  graph: GraphBuilderState;
};

export type PeopleDetailQueryState = {
  view: "detail";
  searchText: string;
  domain: Domain;
  groupBy: string[];
  pageIndex: number;
  pageSize: number;
};

export const PEOPLE_ROUTES = {
  list: "/people",
  detail: "/people",
} as const;

const PEOPLE_PERMISSIONS = {
  canRead: "people.read",
  canCreate: "people.create",
  canEdit: "people.update",
  canDelete: "people.delete",
  canAudit: "people.read",
  canShare: "people.read",
  canExport: "people.read",
} as const;

const PEOPLE_LIST_ACTIONS: RecordModuleActionMap = {
  view: {
    key: "view",
    label: "Abrir pessoa",
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

const PEOPLE_DETAIL_ACTIONS: RecordModuleActionMap = {
  view: {
    key: "view",
    label: "Visualizar pessoa",
    permissionKey: "canRead",
    scope: "detail",
  },
  create: {
    key: "create",
    label: "Nova pessoa",
    permissionKey: "canCreate",
    scope: "detail",
  },
  edit: {
    key: "edit",
    label: "Editar cadastro",
    permissionKey: "canEdit",
    scope: "detail",
  },
  delete: {
    key: "delete",
    label: "Excluir cadastro",
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

const PEOPLE_FIELDS = {
  fullName: { label: "Nome completo", placeholder: "Nome completo" },
  socialName: { label: "Nome social", placeholder: "Nome social" },
  birthDate: { label: "Nascimento", type: "date" },
  sex: { label: "Sexo" },
  gender: { label: "Genero" },
  raceColor: { label: "Raca/Cor" },
  maritalStatus: { label: "Estado civil" },
  nationality: { label: "Nacionalidade" },
  email: { label: "Email" },
  phone: { label: "Telefone" },
  status: { label: "Status" },
  personType: { label: "Tipo" },
  departureReason: { label: "Motivo do desligamento" },
  tags: { label: "Tags" },
  profileSummary: { label: "Resumo" },
  avatarUrl: { label: "Foto", type: "image", emptyValueLabel: "Sem foto" },
  hasHealthCondition: { label: "Condicao de saude", type: "boolean" },
  hasMedication: { label: "Medicacao", type: "boolean" },
  createdAt: { label: "Cadastro", type: "date" },
  updatedAt: { label: "Atualizado em", type: "date" },
  ...Object.fromEntries(
    Object.entries(PEOPLE_AUDIT_FIELD_LABELS).map(([field, label]) => [field, { label }]),
  ),
};

export const peopleListModuleDefinition = defineRecordModule<PeopleListQueryState>({
  moduleId: "people.list",
  basePath: PEOPLE_ROUTES.list,
  featureFlags: createStandardFeatureFlags({
    list: true,
    detail: false,
    kanban: true,
    timeline: true,
    calendar: true,
    graph: true,
  }),
  actionKey: "people.list.screen",
  favoriteKey: "people.list.favorites",
  permissions: PEOPLE_PERMISSIONS,
  actions: PEOPLE_LIST_ACTIONS,
  queryAdapters: {
    listDataProvider: { model: "people.list" },
    detailDataProvider: { model: "people.detail" },
  },
  domainAdapter: {
    entity: { singular: "Pessoa", plural: "Pessoas" },
    list: {
      searchPlaceholder: "Pesquisar pessoas",
      createActionLabel: "Novo",
      totalLabel: "Total",
      emptyStateLabel: "Nenhuma pessoa encontrada.",
    },
    fields: PEOPLE_FIELDS,
    validations: {
      fullName: { required: true, minLength: 2 },
    },
    displayFallbacks: {
      emptyText: "-",
      emptyDate: "Sem data",
      emptyNumber: "0",
      emptyRelation: "Sem vinculo",
    },
  },
  searchConfig: peopleSearchView,
  views: [
    createStandardListView({
      params: {
        searchable: true,
        sortable: true,
        paginated: true,
        sortFields: ["fullName", "status", "personType", "birthDate", "createdAt"],
      },
    }),
    {
      id: "kanban",
      title: "Kanban",
      viewType: "kanban",
      icon: <LayoutGrid className="size-4" />,
      params: {
        columnField: "status",
        titleField: "fullName",
        groupByFields: [
          "status",
          "personType",
          "sex",
          "gender",
          "raceColor",
          "maritalStatus",
          "nationality",
          "hasHealthCondition",
          "hasMedication",
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
        startDateField: "createdAt",
        titleField: "fullName",
        dateFields: ["createdAt", "updatedAt", "birthDate"],
        defaultDateField: "createdAt",
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
        startDateField: "birthDate",
        titleField: "fullName",
        dateFields: ["birthDate", "createdAt", "updatedAt"],
        defaultDateField: "birthDate",
        modes: ["day", "week", "month", "year"],
        defaultMode: "month",
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
            { field: "personType", label: "Tipo", kind: "dimension" },
            { field: "sex", label: "Sexo", kind: "dimension" },
            { field: "gender", label: "Genero", kind: "dimension" },
            { field: "raceColor", label: "Raca/Cor", kind: "dimension" },
            { field: "tags", label: "Tags", kind: "dimension", emptyValueLabel: "Sem tag" },
            { field: "createdAt", label: "Cadastro", kind: "date" },
            { field: "updatedAt", label: "Atualizado em", kind: "date" },
            { field: "birthDate", label: "Nascimento", kind: "date" },
            { field: "age", label: "Idade", kind: "metric", allowedOps: ["avg", "min", "max"] },
          ],
          defaultState: {
            groupBy: "status",
            metric: { field: null, op: "count" },
            timeField: null,
            timeBucket: null,
            chartType: "bar",
            filters: undefined,
          },
        },
      },
    },
  ],
  defaultView: "list",
  defaultQueryState: createStandardListQueryState<PeopleListQueryState>({
    pageSize: 20,
    timelineField: "createdAt",
    timelineSortDirection: "desc",
    calendarField: "birthDate",
    calendarMode: "month",
    rangeFrom: "",
    rangeTo: "",
    graph: {
      groupBy: "status",
      metric: { field: null, op: "count" },
      timeField: null,
      timeBucket: null,
      chartType: "bar",
      filters: undefined,
    },
  }),
});

export const peopleDetailModuleDefinition = defineRecordModule<
  PeopleDetailQueryState,
  PeopleDetailLayoutContext
>({
  moduleId: "people.detail",
  basePath: PEOPLE_ROUTES.detail,
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
  actionKey: "people.detail.screen",
  favoriteKey: "people.detail.favorites",
  permissions: PEOPLE_PERMISSIONS,
  actions: PEOPLE_DETAIL_ACTIONS,
  queryAdapters: {
    listDataProvider: { model: "people.list" },
    detailDataProvider: { model: "people.detail" },
    auditDataProvider: { model: "audit.logs" },
  },
  domainAdapter: {
    entity: { singular: "Pessoa", plural: "Pessoas" },
    detail: {
      createTitle: "Novo",
      fallbackTitle: "Pessoa",
    },
    fields: PEOPLE_FIELDS,
    validations: {
      fullName: { required: true, minLength: 2 },
    },
    displayFallbacks: {
      emptyText: "-",
      emptyDate: "Sem data",
      emptyNumber: "0",
      emptyRelation: "Sem vinculo",
    },
  },
  searchConfig: peopleSearchView,
  views: [createStandardDetailView()],
  defaultView: "detail",
  defaultQueryState: createStandardDetailQueryState<PeopleDetailQueryState>(),
  detailLayout: peopleDetailLayout,
});

export type PeopleModuleDefinition =
  | RecordModuleDefinition<PeopleListQueryState>
  | RecordModuleDefinition<PeopleDetailQueryState, PeopleDetailLayoutContext>;

