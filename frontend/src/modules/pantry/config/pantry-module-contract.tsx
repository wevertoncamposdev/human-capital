import {
  BarChart3,
  CalendarDays,
  Clock3,
  LayoutGrid,
  Table2,
} from "lucide-react";
import type { DateBucket } from "@/lib/date";
import {
  pantryDonorDetailLayout,
  pantryEntryDetailLayout,
  pantryExitDetailLayout,
  pantryItemDetailLayout,
  type PantryDonorDetailLayoutContext,
  type PantryEntryDetailLayoutContext,
  type PantryExitDetailLayoutContext,
  type PantryItemDetailLayoutContext,
} from "@/modules/pantry/config/pantry-detail-layout-contract";
import {
  PANTRY_AUDIT_FIELD_LABELS,
  PANTRY_ACTION_IDS,
  PANTRY_DONOR_TYPE_LABELS,
  PANTRY_ENTRY_AUDIT_FIELD_LABELS,
  PANTRY_EXIT_AUDIT_FIELD_LABELS,
  PANTRY_EXIT_TYPE_LABELS,
  PANTRY_ROUTES,
  PANTRY_SCREEN_STATE_KEYS,
} from "@/modules/pantry/shared/domain/pantry.constants";
import type { Domain } from "@/web-client/domain/types";
import {
  defineRecordModule,
  type GraphBuilderState,
  type RecordModuleDefinition,
  type RecordDomainAdapter,
  type RecordModuleActionMap,
  type ViewConfig,
} from "@/web-client/registry/types";
import {
  pantryDonorsSearchView,
  pantryEntriesSearchView,
  pantryExitsSearchView,
  pantryHistorySearchView,
  pantryStockSearchView,
} from "@/web-client/registry/searchViews/pantry";

type PantryMultiView = "list" | "kanban" | "timeline" | "calendar" | "graph";

type PantryBaseListQueryState = {
  view: PantryMultiView;
  searchText: string;
  domain: Domain;
  groupBy: string[];
  pageIndex: number;
  pageSize: number;
  calendarField: string;
  calendarMode: DateBucket;
  calendarFrom: string;
  calendarTo: string;
  timelineField: string;
  timelineSortDirection: "asc" | "desc";
  graph: GraphBuilderState;
};

export type PantryStockQueryState = PantryBaseListQueryState;
export type PantryHistoryQueryState = PantryBaseListQueryState;

export type PantryDonorsQueryState = {
  view: "list";
  searchText: string;
  domain: Domain;
  groupBy: string[];
  pageIndex: number;
  pageSize: number;
};

export type PantryDetailQueryState = {
  view: "detail";
  searchText: string;
  domain: Domain;
  groupBy: string[];
  pageIndex: number;
  pageSize: number;
};

const PANTRY_BASE_PERMISSIONS = {
  canRead: "pantry.read",
  canCreate: "pantry.create",
  canEdit: "pantry.update",
  canDelete: "pantry.delete",
  canShare: "pantry.read",
  canAudit: "pantry.read",
  canExport: "pantry.read",
};

const PANTRY_DISPLAY_FALLBACKS = {
  emptyText: "—",
  emptyDate: "Sem data",
  emptyNumber: "0",
  emptyRelation: "Sem vínculo",
} as const;

const PANTRY_STOCK_ACTIONS: RecordModuleActionMap = {
  view: {
    key: "view",
    label: "Abrir alimento",
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
  createItem: {
    key: "createItem",
    label: "Novo alimento",
    permissionKey: "canCreate",
    scope: "list",
  },
  createDonor: {
    key: "createDonor",
    label: "Novo doador",
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

const PANTRY_HISTORY_ACTIONS: RecordModuleActionMap = {
  view: {
    key: "view",
    label: "Abrir alimento",
    permissionKey: "canRead",
    scope: "row",
    requiresReturnTo: true,
  },
  refresh: {
    key: "refresh",
    label: "Atualizar",
    permissionKey: "canRead",
    scope: "list",
  },
  export: {
    key: "export",
    label: "Exportar histórico",
    permissionKey: "canExport",
    scope: "list",
  },
};

const PANTRY_DONOR_ACTIONS: RecordModuleActionMap = {
  view: {
    key: "view",
    label: "Abrir doador",
    permissionKey: "canRead",
    scope: "row",
    requiresReturnTo: true,
  },
  createItem: {
    key: "createItem",
    label: "Novo alimento",
    permissionKey: "canCreate",
    scope: "list",
  },
  create: {
    key: "create",
    label: "Novo",
    permissionKey: "canCreate",
    scope: "list",
  },
  edit: {
    key: "edit",
    label: "Editar doador",
    permissionKey: "canEdit",
    scope: "detail",
    requiresReturnTo: true,
  },
  audit: {
    key: "audit",
    label: "Auditoria",
    permissionKey: "canAudit",
    scope: "detail",
  },
  refresh: {
    key: "refresh",
    label: "Atualizar",
    permissionKey: "canRead",
    scope: "list",
  },
};

const PANTRY_ITEM_DETAIL_ACTIONS: RecordModuleActionMap = {
  view: {
    key: "view",
    label: "Visualizar alimento",
    permissionKey: "canRead",
    scope: "detail",
  },
  create: {
    key: "create",
    label: "Novo",
    permissionKey: "canCreate",
    scope: "list",
  },
  edit: {
    key: "edit",
    label: "Editar alimento",
    permissionKey: "canEdit",
    scope: "detail",
  },
  delete: {
    key: "delete",
    label: "Excluir alimento",
    permissionKey: "canDelete",
    scope: "detail",
  },
  audit: {
    key: "audit",
    label: "Auditoria",
    permissionKey: "canAudit",
    scope: "detail",
  },
  createEntry: {
    key: "createEntry",
    label: "Nova entrada",
    permissionKey: "canCreate",
    scope: "relation",
    requiresReturnTo: true,
  },
  createExit: {
    key: "createExit",
    label: "Nova saída",
    permissionKey: "canCreate",
    scope: "relation",
    requiresReturnTo: true,
  },
};

const PANTRY_DONOR_DETAIL_ACTIONS: RecordModuleActionMap = {
  view: {
    key: "view",
    label: "Visualizar doador",
    permissionKey: "canRead",
    scope: "detail",
  },
  create: {
    key: "create",
    label: "Novo",
    permissionKey: "canCreate",
    scope: "list",
  },
  edit: {
    key: "edit",
    label: "Editar doador",
    permissionKey: "canEdit",
    scope: "detail",
  },
  delete: {
    key: "delete",
    label: "Excluir doador",
    permissionKey: "canDelete",
    scope: "detail",
  },
  audit: {
    key: "audit",
    label: "Auditoria",
    permissionKey: "canAudit",
    scope: "detail",
  },
  openEntry: {
    key: "openEntry",
    label: "Abrir doação",
    permissionKey: "canRead",
    scope: "relation",
    requiresReturnTo: true,
  },
};

const PANTRY_ENTRY_DETAIL_ACTIONS: RecordModuleActionMap = {
  view: {
    key: "view",
    label: "Visualizar entrada",
    permissionKey: "canRead",
    scope: "detail",
  },
  create: {
    key: "create",
    label: "Novo",
    permissionKey: "canCreate",
    scope: "list",
  },
  edit: {
    key: "edit",
    label: "Editar entrada",
    permissionKey: "canEdit",
    scope: "detail",
  },
  delete: {
    key: "delete",
    label: "Excluir entrada",
    permissionKey: "canDelete",
    scope: "detail",
  },
  audit: {
    key: "audit",
    label: "Auditoria",
    permissionKey: "canAudit",
    scope: "detail",
  },
  createExit: {
    key: "createExit",
    label: "Nova saída",
    permissionKey: "canCreate",
    scope: "relation",
    requiresReturnTo: true,
  },
  openExit: {
    key: "openExit",
    label: "Abrir saída",
    permissionKey: "canRead",
    scope: "relation",
    requiresReturnTo: true,
  },
};

const PANTRY_EXIT_DETAIL_ACTIONS: RecordModuleActionMap = {
  view: {
    key: "view",
    label: "Visualizar saída",
    permissionKey: "canRead",
    scope: "detail",
  },
  create: {
    key: "create",
    label: "Novo",
    permissionKey: "canCreate",
    scope: "list",
  },
  edit: {
    key: "edit",
    label: "Editar saída",
    permissionKey: "canEdit",
    scope: "detail",
  },
  delete: {
    key: "delete",
    label: "Excluir saída",
    permissionKey: "canDelete",
    scope: "detail",
  },
  audit: {
    key: "audit",
    label: "Auditoria",
    permissionKey: "canAudit",
    scope: "detail",
  },
  openEntry: {
    key: "openEntry",
    label: "Abrir entrada",
    permissionKey: "canRead",
    scope: "relation",
    requiresReturnTo: true,
  },
};

const PANTRY_STOCK_DOMAIN_ADAPTER: RecordDomainAdapter = {
  entity: { singular: "Alimento", plural: "Estoque" },
  list: {
    searchPlaceholder: "Pesquisar alimentos, grupos ou setores",
    createActionLabel: "Novo",
    totalLabel: "Total",
    emptyStateLabel: "Nenhum resultado.",
  },
  fields: {
    name: { label: "Alimento", placeholder: "Ex: Arroz" },
    group: { label: "Grupo", emptyValueLabel: "Sem grupo" },
    sector: { label: "Setor", emptyValueLabel: "Geral" },
    sectorStock: { label: "Saldo (setor)", type: "number" },
    itemStock: { label: "Saldo (total)", type: "number" },
    unit: { label: "Unidade" },
    minStock: { label: "Mínimo", type: "number" },
    isBelowMin: { label: "Abaixo do mínimo", type: "boolean" },
    nextExpiryDate: { label: "Próx. validade", type: "date" },
    daysToExpire: { label: "Dias", type: "number" },
    validityStatus: { label: "Validade" },
  },
  validations: {
    name: { required: true, minLength: 2 },
    minStock: { min: 0 },
  },
  displayFallbacks: PANTRY_DISPLAY_FALLBACKS,
};

const PANTRY_HISTORY_DOMAIN_ADAPTER: RecordDomainAdapter = {
  entity: { singular: "Movimento", plural: "Histórico" },
  list: {
    searchPlaceholder: "Pesquisar movimentos, itens, doadores ou eventos",
    totalLabel: "Total",
    emptyStateLabel: "Nenhum resultado.",
  },
  fields: {
    kind: { label: "Tipo de movimento" },
    movementDate: { label: "Data do movimento", type: "date" },
    sector: { label: "Setor", emptyValueLabel: "Geral" },
    type: { label: "Tipo de saída" },
    eventName: { label: "Evento", emptyValueLabel: "Sem evento" },
    donorName: { label: "Doador", emptyValueLabel: "Sem doador" },
    itemName: { label: "Alimento" },
    itemGroup: { label: "Grupo do alimento", emptyValueLabel: "Sem grupo" },
    expiryDate: { label: "Validade", type: "date" },
    actor: { label: "Usuário", emptyValueLabel: "Sistema" },
    notes: { label: "Notas", emptyValueLabel: "Sem notas" },
  },
  displayFallbacks: PANTRY_DISPLAY_FALLBACKS,
};

const PANTRY_DONOR_DOMAIN_ADAPTER: RecordDomainAdapter = {
  entity: { singular: "Doador", plural: "Doadores" },
  list: {
    searchPlaceholder: "Pesquisar doadores por nome, tipo ou contato",
    createActionLabel: "Novo",
    totalLabel: "Total",
    emptyStateLabel: "Nenhum resultado.",
  },
  detail: {
    createTitle: "Novo doador",
    fallbackTitle: "Doador",
  },
  fields: {
    name: { label: "Nome", placeholder: "Ex: Mercado Central" },
    type: { label: "Tipo", emptyValueLabel: PANTRY_DONOR_TYPE_LABELS.PERSON },
    avatarUrl: {
      label: "Foto",
      type: "image",
      emptyValueLabel: "Sem foto",
    },
    contact: {
      label: "Contato",
      placeholder: "Telefone, e-mail...",
      emptyValueLabel: "Sem contato",
    },
    createdAt: { label: "Criado em", type: "date" },
    updatedAt: { label: "Atualizado em", type: "date" },
  },
  validations: {
    name: { required: true, minLength: 2 },
    contact: { maxLength: 255 },
  },
  displayFallbacks: PANTRY_DISPLAY_FALLBACKS,
};

const PANTRY_ITEM_DOMAIN_ADAPTER: RecordDomainAdapter = {
  entity: { singular: "Alimento", plural: "Alimentos" },
  detail: {
    createTitle: "Novo alimento",
    fallbackTitle: "Alimento",
  },
  fields: {
    ...Object.fromEntries(
      Object.entries(PANTRY_AUDIT_FIELD_LABELS).map(([field, label]) => [
        field,
        { label },
      ]),
    ),
    stock: { label: "Saldo", type: "number" },
    nextExpiryDate: { label: "Próx. validade", type: "date" },
    lastMovementDate: { label: "Último movimento", type: "date" },
  },
  validations: {
    name: { required: true, minLength: 2 },
    minStock: { min: 0 },
  },
  displayFallbacks: PANTRY_DISPLAY_FALLBACKS,
};

const PANTRY_ENTRY_DOMAIN_ADAPTER: RecordDomainAdapter = {
  entity: { singular: "Entrada", plural: "Entradas" },
  detail: {
    createTitle: "Nova entrada",
    fallbackTitle: "Entrada",
  },
  fields: {
    ...Object.fromEntries(
      Object.entries(PANTRY_ENTRY_AUDIT_FIELD_LABELS).map(([field, label]) => [
        field,
        { label },
      ]),
    ),
    donorId: { label: "Doador", type: "uuid", emptyValueLabel: "Sem doador" },
    sector: { label: "Setor" },
    quantity: { label: "Quantidade", type: "number" },
    unit: { label: "Unidade" },
    entryDate: { label: "Data da entrada", type: "date" },
    expiryDate: {
      label: "Validade",
      type: "date",
      emptyValueLabel: "Sem validade",
    },
    notes: { label: "Notas", placeholder: "Notas (opcional)" },
  },
  validations: {
    sector: { required: true, minLength: 1 },
    quantity: { required: true, min: 0.000001 },
    unit: { required: true, minLength: 1 },
  },
  displayFallbacks: PANTRY_DISPLAY_FALLBACKS,
};

const PANTRY_EXIT_DOMAIN_ADAPTER: RecordDomainAdapter = {
  entity: { singular: "Saída", plural: "Saídas" },
  detail: {
    createTitle: "Nova saída",
    fallbackTitle: "Saída",
  },
  fields: {
    ...Object.fromEntries(
      Object.entries(PANTRY_EXIT_AUDIT_FIELD_LABELS).map(([field, label]) => [
        field,
        { label },
      ]),
    ),
    entryId: { label: "Entrada", type: "uuid", emptyValueLabel: "Automático" },
    sector: { label: "Setor" },
    quantity: { label: "Quantidade", type: "number" },
    unit: { label: "Unidade" },
    exitDate: { label: "Data da saída", type: "date" },
    type: { label: "Tipo de saída" },
    eventName: { label: "Evento", emptyValueLabel: "Sem evento" },
    notes: { label: "Notas", placeholder: "Notas (opcional)" },
  },
  validations: {
    sector: { required: true, minLength: 1 },
    quantity: { required: true, min: 0.000001 },
    unit: { required: true, minLength: 1 },
  },
  displayFallbacks: PANTRY_DISPLAY_FALLBACKS,
};

const LIST_SUPPORT = {
  supportsCreate: true,
  supportsSelection: true,
  supportsSearch: true,
  supportsGrouping: true,
  supportsPagination: true,
  supportsSort: true,
} as const;

const ANALYTIC_SUPPORT = {
  supportsCreate: false,
  supportsSelection: false,
  supportsSearch: true,
  supportsGrouping: true,
  supportsPagination: false,
  supportsSort: false,
} as const;

const DETAIL_SUPPORT = {
  supportsCreate: false,
  supportsSelection: false,
  supportsSearch: false,
  supportsGrouping: false,
  supportsPagination: false,
  supportsSort: false,
} as const;

const STOCK_VIEWS: ViewConfig[] = [
  {
    id: "list",
    title: "Tabela",
    viewType: "list",
    icon: <Table2 className="size-4" />,
    isDefault: true,
    supports: LIST_SUPPORT,
    params: {
      searchable: true,
      sortable: true,
      paginated: true,
      sortFields: [
        "name",
        "group",
        "sector",
        "sectorStock",
        "itemStock",
        "nextExpiryDate",
      ],
    },
  },
  {
    id: "kanban",
    title: "Kanban",
    viewType: "kanban",
    icon: <LayoutGrid className="size-4" />,
    supports: ANALYTIC_SUPPORT,
    params: {
      columnField: "sector",
      titleField: "name",
      groupByFields: ["sector", "group", "validityStatus", "unit"],
      defaultGroupByField: "sector",
    },
  },
  {
    id: "timeline",
    title: "Timeline",
    viewType: "timeline",
    icon: <Clock3 className="size-4" />,
    supports: ANALYTIC_SUPPORT,
    params: {
      startDateField: "nextExpiryDate",
      titleField: "name",
      dateFields: ["nextExpiryDate"],
      defaultDateField: "nextExpiryDate",
      sortDirections: ["desc", "asc"],
      defaultSortDirection: "desc",
    },
  },
  {
    id: "calendar",
    title: "Calendário",
    viewType: "calendar",
    icon: <CalendarDays className="size-4" />,
    supports: ANALYTIC_SUPPORT,
    params: {
      startDateField: "nextExpiryDate",
      titleField: "name",
      dateFields: ["nextExpiryDate"],
      defaultDateField: "nextExpiryDate",
      modes: ["day", "week", "month", "year"],
      defaultMode: "month",
    },
  },
  {
    id: "graph",
    title: "Gráfico",
    viewType: "graph",
    icon: <BarChart3 className="size-4" />,
    supports: ANALYTIC_SUPPORT,
    params: {
      builder: {
        fields: [
          { field: "name", label: "Alimento", kind: "dimension" },
          { field: "sector", label: "Setor", kind: "dimension", emptyValueLabel: "Geral" },
          { field: "group", label: "Grupo", kind: "dimension", emptyValueLabel: "Sem grupo" },
          { field: "unit", label: "Unidade", kind: "dimension" },
          { field: "validityStatus", label: "Validade", kind: "dimension" },
          {
            field: "isBelowMin",
            label: "Abaixo do mínimo",
            kind: "dimension",
            formatValue: (value) => (value ? "Abaixo do mínimo" : "OK"),
          },
          { field: "nextExpiryDate", label: "Prox. validade", kind: "date" },
          { field: "sectorStock", label: "Saldo (setor)", kind: "metric" },
          { field: "itemStock", label: "Saldo (total)", kind: "metric" },
          { field: "minStock", label: "Estoque mínimo", kind: "metric" },
          { field: "daysToExpire", label: "Dias", kind: "metric" },
          {
            field: "itemId",
            label: "Item",
            kind: "dimension",
            getValue: (row) => row.itemId,
            formatValue: (_value, row) => String(row?.name ?? "Item"),
          },
        ],
        defaultState: {
          groupBy: "sector",
          metric: {
            field: "sectorStock",
            op: "sum",
          },
          timeField: null,
          timeBucket: "month",
          chartType: "bar",
          filters: {},
        },
        filters: [
          {
            id: "itemId",
            field: "itemId",
            label: "Item",
            type: "select",
            operator: "=",
            options: (rows) =>
              Array.from(
                new Map(
                  rows
                    .filter((row) => typeof row.itemId === "string" && typeof row.name === "string")
                    .map((row) => [String(row.itemId), String(row.name)]),
                ).entries(),
              )
                .sort((left, right) => left[1].localeCompare(right[1]))
                .slice(0, 200)
                .map(([value, label]) => ({ value, label })),
          },
          {
            id: "from",
            field: "nextExpiryDate",
            label: "De",
            type: "date",
            operator: ">=",
          },
          {
            id: "to",
            field: "nextExpiryDate",
            label: "Até",
            type: "date",
            operator: "<=",
          },
        ],
        maxGroups: 12,
        downloadFileName: "estoque",
      },
    },
  },
];

const HISTORY_VIEWS: ViewConfig[] = [
  {
    id: "list",
    title: "Tabela",
    viewType: "list",
    icon: <Table2 className="size-4" />,
    isDefault: true,
    supports: LIST_SUPPORT,
    params: {
      searchable: true,
      sortable: true,
      paginated: true,
      sortFields: [
        "movementDate",
        "kind",
        "sector",
        "type",
        "itemName",
        "donorName",
      ],
    },
  },
  {
    id: "kanban",
    title: "Kanban",
    viewType: "kanban",
    icon: <LayoutGrid className="size-4" />,
    supports: ANALYTIC_SUPPORT,
    params: {
      columnField: "kind",
      titleField: "itemName",
      groupByFields: ["kind", "sector", "type", "eventName", "donorName"],
      defaultGroupByField: "kind",
    },
  },
  {
    id: "timeline",
    title: "Timeline",
    viewType: "timeline",
    icon: <Clock3 className="size-4" />,
    supports: ANALYTIC_SUPPORT,
    params: {
      startDateField: "movementDate",
      titleField: "itemName",
      dateFields: ["movementDate", "expiryDate"],
      defaultDateField: "movementDate",
      sortDirections: ["desc", "asc"],
      defaultSortDirection: "desc",
    },
  },
  {
    id: "calendar",
    title: "Calendário",
    viewType: "calendar",
    icon: <CalendarDays className="size-4" />,
    supports: ANALYTIC_SUPPORT,
    params: {
      startDateField: "movementDate",
      titleField: "itemName",
      dateFields: ["movementDate", "expiryDate"],
      defaultDateField: "movementDate",
      modes: ["day", "week", "month", "year"],
      defaultMode: "month",
    },
  },
  {
    id: "graph",
    title: "Gráfico",
    viewType: "graph",
    icon: <BarChart3 className="size-4" />,
    supports: ANALYTIC_SUPPORT,
    params: {
      builder: {
        fields: [
          {
            field: "kind",
            label: "Movimento",
            kind: "dimension",
            formatValue: (value) => (value === "ENTRY" ? "Entrada" : "Saída"),
          },
          { field: "sector", label: "Setor", kind: "dimension", emptyValueLabel: "Geral" },
          {
            field: "type",
            label: "Tipo de saída",
            kind: "dimension",
            formatValue: (value) =>
              typeof value === "string" && value in PANTRY_EXIT_TYPE_LABELS
                ? PANTRY_EXIT_TYPE_LABELS[value as keyof typeof PANTRY_EXIT_TYPE_LABELS]
                : "Sem tipo",
          },
          {
            field: "itemId",
            label: "Item",
            kind: "dimension",
            getValue: (row) => row.itemId,
            formatValue: (_value, row) =>
              String((row?.item as { name?: string } | undefined)?.name ?? "Item"),
          },
          {
            field: "itemGroup",
            label: "Grupo",
            kind: "dimension",
            getValue: (row) =>
              (row.item as { group?: string } | undefined)?.group ?? "Sem grupo",
          },
          { field: "eventName", label: "Evento", kind: "dimension", emptyValueLabel: "Sem evento" },
          { field: "donorName", label: "Doador", kind: "dimension", emptyValueLabel: "Sem doador" },
          { field: "actor", label: "Usuário", kind: "dimension", emptyValueLabel: "Sistema" },
          { field: "movementDate", label: "Data do movimento", kind: "date" },
          { field: "expiryDate", label: "Validade", kind: "date" },
          { field: "quantity", label: "Quantidade", kind: "metric" },
        ],
        defaultState: {
          groupBy: "kind",
          metric: {
            field: "quantity",
            op: "sum",
          },
          timeField: null,
          timeBucket: "month",
          chartType: "bar",
          filters: {},
        },
        filters: [
          {
            id: "itemId",
            field: "itemId",
            label: "Item",
            type: "select",
            operator: "=",
            options: (rows) =>
              Array.from(
                new Map(
                  rows
                    .filter((row) => typeof row.itemId === "string")
                    .map((row) => [
                      String(row.itemId),
                      String(
                        (row.item as { name?: string } | undefined)?.name ?? row.itemId,
                      ),
                    ]),
                ).entries(),
              )
                .sort((left, right) => left[1].localeCompare(right[1]))
                .slice(0, 200)
                .map(([value, label]) => ({ value, label })),
          },
          {
            id: "from",
            field: "movementDate",
            label: "De",
            type: "date",
            operator: ">=",
          },
          {
            id: "to",
            field: "movementDate",
            label: "Até",
            type: "date",
            operator: "<=",
          },
        ],
        maxGroups: 12,
        downloadFileName: "histórico",
      },
    },
  },
];

const DONOR_LIST_VIEWS: ViewConfig[] = [
  {
    id: "list",
    title: "Tabela",
    viewType: "list",
    icon: <Table2 className="size-4" />,
    isDefault: true,
    supports: {
      ...LIST_SUPPORT,
      supportsSelection: false,
    },
    params: {
      searchable: true,
      sortable: true,
      paginated: true,
      sortFields: ["name", "type", "contact", "createdAt", "updatedAt"],
    },
  },
];

const DETAIL_VIEWS: ViewConfig[] = [
  {
    id: "detail",
    title: "Detalhe",
    viewType: "detail",
    icon: <Table2 className="size-4" />,
    isDefault: true,
    supports: DETAIL_SUPPORT,
    params: {
      usesDetailShell: true,
    },
  },
];

const STOCK_DEFAULT_QUERY_STATE: PantryStockQueryState = {
  view: "list",
  searchText: "",
  domain: null,
  groupBy: [],
  pageIndex: 0,
  pageSize: 20,
  calendarField: "nextExpiryDate",
  calendarMode: "month",
  calendarFrom: "",
  calendarTo: "",
  timelineField: "nextExpiryDate",
  timelineSortDirection: "desc",
  graph: {
    groupBy: "sector",
    metric: {
      field: "sectorStock",
      op: "sum",
    },
    timeField: null,
    timeBucket: "month",
    chartType: "bar",
    filters: {},
  },
};

const HISTORY_DEFAULT_QUERY_STATE: PantryHistoryQueryState = {
  view: "list",
  searchText: "",
  domain: null,
  groupBy: [],
  pageIndex: 0,
  pageSize: 50,
  calendarField: "movementDate",
  calendarMode: "month",
  calendarFrom: "",
  calendarTo: "",
  timelineField: "movementDate",
  timelineSortDirection: "desc",
  graph: {
    groupBy: "kind",
    metric: {
      field: "quantity",
      op: "sum",
    },
    timeField: null,
    timeBucket: "month",
    chartType: "bar",
    filters: {},
  },
};

const DONORS_DEFAULT_QUERY_STATE: PantryDonorsQueryState = {
  view: "list",
  searchText: "",
  domain: null,
  groupBy: [],
  pageIndex: 0,
  pageSize: 50,
};

const DETAIL_DEFAULT_QUERY_STATE: PantryDetailQueryState = {
  view: "detail",
  searchText: "",
  domain: null,
  groupBy: [],
  pageIndex: 0,
  pageSize: 1,
};

const STOCK_FEATURE_FLAGS = {
  list: true,
  detail: false,
  notes: false,
  audit: false,
  grouped: false,
  timeline: true,
  calendar: true,
  kanban: true,
  graph: true,
  export: false,
  share: false,
} as const;

const HISTORY_FEATURE_FLAGS = {
  list: true,
  detail: false,
  notes: false,
  audit: false,
  grouped: false,
  timeline: true,
  calendar: true,
  kanban: true,
  graph: true,
  export: true,
  share: false,
} as const;

const DONOR_LIST_FEATURE_FLAGS = {
  list: true,
  detail: false,
  notes: false,
  audit: false,
  grouped: false,
  timeline: false,
  calendar: false,
  kanban: false,
  graph: false,
  export: false,
  share: false,
} as const;

const DETAIL_FEATURE_FLAGS = {
  list: false,
  detail: true,
  notes: true,
  comments: true,
  tags: true,
  attachments: true,
  history: true,
  context: true,
  audit: true,
  grouped: false,
  timeline: false,
  calendar: false,
  kanban: false,
  graph: false,
  export: false,
  share: false,
} as const;

export const pantryStockModuleDefinition =
  defineRecordModule<PantryStockQueryState>({
    moduleId: "pantry.stock",
    basePath: PANTRY_ROUTES.stock,
    featureFlags: STOCK_FEATURE_FLAGS,
    actionKey: PANTRY_SCREEN_STATE_KEYS.stock,
    favoriteKey: PANTRY_ACTION_IDS.stock,
    permissions: PANTRY_BASE_PERMISSIONS,
    actions: PANTRY_STOCK_ACTIONS,
    queryAdapters: {
      listDataProvider: { model: "pantry.stock" },
    },
    domainAdapter: PANTRY_STOCK_DOMAIN_ADAPTER,
    searchConfig: pantryStockSearchView,
    views: STOCK_VIEWS,
    defaultView: "list",
    defaultQueryState: STOCK_DEFAULT_QUERY_STATE,
  });

export const pantryHistoryModuleDefinition =
  defineRecordModule<PantryHistoryQueryState>({
    moduleId: "pantry.history",
    basePath: PANTRY_ROUTES.history,
    featureFlags: HISTORY_FEATURE_FLAGS,
    actionKey: PANTRY_SCREEN_STATE_KEYS.history,
    favoriteKey: PANTRY_ACTION_IDS.history,
    permissions: PANTRY_BASE_PERMISSIONS,
    actions: PANTRY_HISTORY_ACTIONS,
    queryAdapters: {
      listDataProvider: { model: "pantry.history" },
    },
    domainAdapter: PANTRY_HISTORY_DOMAIN_ADAPTER,
    searchConfig: pantryHistorySearchView,
    views: HISTORY_VIEWS,
    defaultView: "list",
    defaultQueryState: HISTORY_DEFAULT_QUERY_STATE,
  });

export const pantryDonorsModuleDefinition =
  defineRecordModule<PantryDonorsQueryState>({
    moduleId: "pantry.donors",
    basePath: PANTRY_ROUTES.donors,
    featureFlags: DONOR_LIST_FEATURE_FLAGS,
    actionKey: PANTRY_SCREEN_STATE_KEYS.donors,
    favoriteKey: PANTRY_ACTION_IDS.donors,
    permissions: PANTRY_BASE_PERMISSIONS,
    actions: PANTRY_DONOR_ACTIONS,
    queryAdapters: {
      listDataProvider: { model: "pantry.donors" },
    },
    domainAdapter: PANTRY_DONOR_DOMAIN_ADAPTER,
    searchConfig: pantryDonorsSearchView,
    views: DONOR_LIST_VIEWS,
    defaultView: "list",
    defaultQueryState: DONORS_DEFAULT_QUERY_STATE,
  });

export const pantryItemDetailModuleDefinition = defineRecordModule<
  PantryDetailQueryState,
  PantryItemDetailLayoutContext
>({
  moduleId: "pantry.item",
  basePath: PANTRY_ROUTES.items,
  featureFlags: DETAIL_FEATURE_FLAGS,
  actionKey: PANTRY_SCREEN_STATE_KEYS.itemsDetail,
  favoriteKey: PANTRY_ACTION_IDS.itemsDetail,
  permissions: PANTRY_BASE_PERMISSIONS,
  actions: PANTRY_ITEM_DETAIL_ACTIONS,
  queryAdapters: {
    listDataProvider: { model: "pantry.stock" },
    detailDataProvider: { model: "pantry.items" },
    auditDataProvider: { model: "pantry.items.audit" },
  },
  domainAdapter: PANTRY_ITEM_DOMAIN_ADAPTER,
  searchConfig: pantryStockSearchView,
  views: DETAIL_VIEWS,
  defaultView: "detail",
  defaultQueryState: DETAIL_DEFAULT_QUERY_STATE,
  detailLayout: pantryItemDetailLayout,
  relatedSources: [
    {
      key: "entries",
      label: "Entradas",
      viewType: "list",
      dataSource: "pantry.entries",
      count: (context) => context.entryRows.length,
      onOpen: (context, entityId) => context.onOpenEntry(entityId),
    },
    {
      key: "exits",
      label: "Saídas",
      viewType: "list",
      dataSource: "pantry.exits",
      count: (context) => context.exitRows.length,
      onOpen: (context, entityId) => context.onOpenExit(entityId),
    },
    {
      key: "history",
      label: "Histórico",
      viewType: "list",
      dataSource: "pantry.history",
      count: (context) => context.historyRows.length,
    },
  ],
});

export const pantryDonorDetailModuleDefinition = defineRecordModule<
  PantryDetailQueryState,
  PantryDonorDetailLayoutContext
>({
  moduleId: "pantry.donor",
  basePath: PANTRY_ROUTES.donors,
  featureFlags: {
    ...DETAIL_FEATURE_FLAGS,
  },
  actionKey: PANTRY_SCREEN_STATE_KEYS.donorsDetail,
  favoriteKey: PANTRY_ACTION_IDS.donorsDetail,
  permissions: PANTRY_BASE_PERMISSIONS,
  actions: PANTRY_DONOR_DETAIL_ACTIONS,
  queryAdapters: {
    listDataProvider: { model: "pantry.donors" },
    detailDataProvider: { model: "pantry.donors" },
    auditDataProvider: { model: "pantry.donors.audit" },
  },
  domainAdapter: PANTRY_DONOR_DOMAIN_ADAPTER,
  searchConfig: pantryDonorsSearchView,
  views: DETAIL_VIEWS,
  defaultView: "detail",
  defaultQueryState: DETAIL_DEFAULT_QUERY_STATE,
  detailLayout: pantryDonorDetailLayout,
  relatedSources: [
    {
      key: "donations",
      viewType: "list",
      dataSource: "pantry.entries",
      label: "Doacões",
      count: (context) => context.entries.length,
      onOpen: (context, entityId) => context.onOpenEntry(entityId),
    },
  ],
});

export const pantryEntryDetailModuleDefinition = defineRecordModule<
  PantryDetailQueryState,
  PantryEntryDetailLayoutContext
>({
  moduleId: "pantry.entry",
  basePath: PANTRY_ROUTES.entries,
  featureFlags: {
    ...DETAIL_FEATURE_FLAGS,
  },
  actionKey: PANTRY_SCREEN_STATE_KEYS.entriesDetail,
  favoriteKey: PANTRY_ACTION_IDS.entriesDetail,
  permissions: PANTRY_BASE_PERMISSIONS,
  actions: PANTRY_ENTRY_DETAIL_ACTIONS,
  queryAdapters: {
    listDataProvider: { model: "pantry.entries" },
    detailDataProvider: { model: "pantry.entries" },
    auditDataProvider: { model: "pantry.entries.audit" },
  },
  domainAdapter: PANTRY_ENTRY_DOMAIN_ADAPTER,
  searchConfig: pantryEntriesSearchView,
  views: DETAIL_VIEWS,
  defaultView: "detail",
  defaultQueryState: DETAIL_DEFAULT_QUERY_STATE,
  detailLayout: pantryEntryDetailLayout,
  relatedSources: [
    {
      key: "allocatedExits",
      label: "Saídas vinculadas",
      viewType: "list",
      dataSource: "pantry.exits",
      count: (context) => context.allocatedExits.length,
      onOpen: (context, entityId) => context.onOpenExit(entityId),
    },
  ],
});

export const pantryExitDetailModuleDefinition = defineRecordModule<
  PantryDetailQueryState,
  PantryExitDetailLayoutContext
>({
  moduleId: "pantry.exit",
  basePath: PANTRY_ROUTES.exits,
  featureFlags: {
    ...DETAIL_FEATURE_FLAGS,
  },
  actionKey: PANTRY_SCREEN_STATE_KEYS.exitsDetail,
  favoriteKey: PANTRY_ACTION_IDS.exitsDetail,
  permissions: PANTRY_BASE_PERMISSIONS,
  actions: PANTRY_EXIT_DETAIL_ACTIONS,
  queryAdapters: {
    listDataProvider: { model: "pantry.exits" },
    detailDataProvider: { model: "pantry.exits" },
    auditDataProvider: { model: "pantry.exits.audit" },
  },
  domainAdapter: PANTRY_EXIT_DOMAIN_ADAPTER,
  searchConfig: pantryExitsSearchView,
  views: DETAIL_VIEWS,
  defaultView: "detail",
  defaultQueryState: DETAIL_DEFAULT_QUERY_STATE,
  detailLayout: pantryExitDetailLayout,
  relatedSources: [
    {
      key: "allocations",
      label: "Lotes vinculados",
      viewType: "list",
      dataSource: "pantry.entries",
      count: (context) => context.exit?.allocations?.length ?? 0,
      onOpen: (context, entityId) => context.onOpenEntry(entityId),
    },
  ],
});

export type PantryModuleDefinition =
  | RecordModuleDefinition<PantryStockQueryState>
  | RecordModuleDefinition<PantryHistoryQueryState>
  | RecordModuleDefinition<PantryDonorsQueryState>
  | RecordModuleDefinition<
      PantryDetailQueryState,
      PantryItemDetailLayoutContext
    >
  | RecordModuleDefinition<
      PantryDetailQueryState,
      PantryDonorDetailLayoutContext
    >
  | RecordModuleDefinition<
      PantryDetailQueryState,
      PantryEntryDetailLayoutContext
    >
  | RecordModuleDefinition<
      PantryDetailQueryState,
      PantryExitDetailLayoutContext
    >;
