import {
  BarChart3,
  CalendarDays,
  Clock3,
  LayoutGrid,
  Table2,
} from "lucide-react";
import type { DateBucket } from "@/lib/date";
import {
  depositDonorDetailLayout,
  depositEntryDetailLayout,
  depositExitDetailLayout,
  depositItemDetailLayout,
  type DepositDonorDetailLayoutContext,
  type DepositEntryDetailLayoutContext,
  type DepositExitDetailLayoutContext,
  type DepositItemDetailLayoutContext,
} from "@/modules/deposit/config/deposit-detail-layout-contract";
import {
  DEPOSIT_AUDIT_FIELD_LABELS,
  DEPOSIT_ACTION_IDS,
  DEPOSIT_DONOR_TYPE_LABELS,
  DEPOSIT_ENTRY_AUDIT_FIELD_LABELS,
  DEPOSIT_EXIT_AUDIT_FIELD_LABELS,
  DEPOSIT_EXIT_TYPE_LABELS,
  DEPOSIT_ROUTES,
  DEPOSIT_SCREEN_STATE_KEYS,
} from "@/modules/deposit/shared/domain/deposit.constants";
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
  depositDonorsSearchView,
  depositEntriesSearchView,
  depositExitsSearchView,
  depositHistorySearchView,
  depositStockSearchView,
} from "@/web-client/registry/searchViews/deposit";

type DepositMultiView = "list" | "kanban" | "timeline" | "calendar" | "graph";

type DepositBaseListQueryState = {
  view: DepositMultiView;
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

export type DepositStockQueryState = DepositBaseListQueryState;
export type DepositHistoryQueryState = DepositBaseListQueryState;

export type DepositDonorsQueryState = {
  view: "list";
  searchText: string;
  domain: Domain;
  groupBy: string[];
  pageIndex: number;
  pageSize: number;
};

export type DepositDetailQueryState = {
  view: "detail";
  searchText: string;
  domain: Domain;
  groupBy: string[];
  pageIndex: number;
  pageSize: number;
};

const DEPOSIT_BASE_PERMISSIONS = {
  canRead: "deposit.read",
  canCreate: "deposit.create",
  canEdit: "deposit.update",
  canDelete: "deposit.delete",
  canShare: "deposit.read",
  canAudit: "deposit.read",
  canExport: "deposit.read",
};

const DEPOSIT_DISPLAY_FALLBACKS = {
  emptyText: "-",
  emptyDate: "Sem data",
  emptyNumber: "0",
  emptyRelation: "Sem vínculo",
} as const;

const DEPOSIT_STOCK_ACTIONS: RecordModuleActionMap = {
  view: {
    key: "view",
    label: "Abrir objeto",
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
    label: "Novo objeto",
    permissionKey: "canCreate",
    scope: "list",
  },
  createDonor: {
    key: "createDonor",
    label: "Nova fonte",
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

const DEPOSIT_HISTORY_ACTIONS: RecordModuleActionMap = {
  view: {
    key: "view",
    label: "Abrir objeto",
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

const DEPOSIT_DONOR_ACTIONS: RecordModuleActionMap = {
  view: {
    key: "view",
    label: "Abrir fonte",
    permissionKey: "canRead",
    scope: "row",
    requiresReturnTo: true,
  },
  createItem: {
    key: "createItem",
    label: "Novo objeto",
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
    label: "Editar fonte",
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

const DEPOSIT_ITEM_DETAIL_ACTIONS: RecordModuleActionMap = {
  view: {
    key: "view",
    label: "Visualizar objeto",
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
    label: "Editar objeto",
    permissionKey: "canEdit",
    scope: "detail",
  },
  delete: {
    key: "delete",
    label: "Excluir objeto",
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

const DEPOSIT_DONOR_DETAIL_ACTIONS: RecordModuleActionMap = {
  view: {
    key: "view",
    label: "Visualizar fonte",
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
    label: "Editar fonte",
    permissionKey: "canEdit",
    scope: "detail",
  },
  delete: {
    key: "delete",
    label: "Excluir fonte",
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

const DEPOSIT_ENTRY_DETAIL_ACTIONS: RecordModuleActionMap = {
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

const DEPOSIT_EXIT_DETAIL_ACTIONS: RecordModuleActionMap = {
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

const DEPOSIT_STOCK_DOMAIN_ADAPTER: RecordDomainAdapter = {
  entity: { singular: "Objeto", plural: "Estoque" },
  list: {
    searchPlaceholder: "Pesquisar objetos, grupos ou setores",
    createActionLabel: "Novo",
    totalLabel: "Total",
    emptyStateLabel: "Nenhum resultado.",
  },
  fields: {
    name: { label: "Objeto", placeholder: "Ex: Arroz" },
    group: { label: "Grupo", emptyValueLabel: "Sem grupo" },
    sector: { label: "Setor", emptyValueLabel: "Geral" },
    sectorStock: { label: "Saldo (setor)", type: "number" },
    itemStock: { label: "Saldo (total)", type: "number" },
    unit: { label: "Unidade" },
    minStock: { label: "Mínimo", type: "number" },
    isBelowMin: { label: "Abaixo do mínimo", type: "boolean" },
    nextExpiryDate: { label: "Data limite", type: "date" },
    daysToExpire: { label: "Dias", type: "number" },
    validityStatus: { label: "Status" },
  },
  validations: {
    name: { required: true, minLength: 2 },
    minStock: { min: 0 },
  },
  displayFallbacks: DEPOSIT_DISPLAY_FALLBACKS,
};

const DEPOSIT_HISTORY_DOMAIN_ADAPTER: RecordDomainAdapter = {
  entity: { singular: "Movimento", plural: "Histórico" },
  list: {
    searchPlaceholder: "Pesquisar movimentos, itens, fontes ou destinos",
    totalLabel: "Total",
    emptyStateLabel: "Nenhum resultado.",
  },
  fields: {
    kind: { label: "Tipo de movimento" },
    movementDate: { label: "Data do movimento", type: "date" },
    sector: { label: "Setor", emptyValueLabel: "Geral" },
    type: { label: "Tipo de saída" },
    destinationName: { label: "Destino", emptyValueLabel: "Sem destino" },
    donorName: { label: "Fonte", emptyValueLabel: "Sem fonte" },
    itemName: { label: "Objeto" },
    itemGroup: { label: "Grupo do objeto", emptyValueLabel: "Sem grupo" },
    expiryDate: { label: "Data limite", type: "date" },
    actor: { label: "Usuário", emptyValueLabel: "Sistema" },
    notes: { label: "Notas", emptyValueLabel: "Sem notas" },
  },
  displayFallbacks: DEPOSIT_DISPLAY_FALLBACKS,
};

const DEPOSIT_DONOR_DOMAIN_ADAPTER: RecordDomainAdapter = {
  entity: { singular: "Fonte", plural: "Fontes" },
  list: {
    searchPlaceholder: "Pesquisar fontes por nome, tipo ou contato",
    createActionLabel: "Novo",
    totalLabel: "Total",
    emptyStateLabel: "Nenhum resultado.",
  },
  detail: {
    createTitle: "Nova fonte",
    fallbackTitle: "Fonte",
  },
  fields: {
    name: { label: "Nome", placeholder: "Ex: Mercado Central" },
    type: { label: "Tipo", emptyValueLabel: DEPOSIT_DONOR_TYPE_LABELS.PERSON },
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
  displayFallbacks: DEPOSIT_DISPLAY_FALLBACKS,
};

const DEPOSIT_ITEM_DOMAIN_ADAPTER: RecordDomainAdapter = {
  entity: { singular: "Objeto", plural: "Objetos" },
  detail: {
    createTitle: "Novo objeto",
    fallbackTitle: "Objeto",
  },
  fields: {
    ...Object.fromEntries(
      Object.entries(DEPOSIT_AUDIT_FIELD_LABELS).map(([field, label]) => [
        field,
        { label },
      ]),
    ),
    stock: { label: "Saldo", type: "number" },
    nextExpiryDate: { label: "Data limite", type: "date" },
    lastMovementDate: { label: "Último movimento", type: "date" },
  },
  validations: {
    name: { required: true, minLength: 2 },
    minStock: { min: 0 },
  },
  displayFallbacks: DEPOSIT_DISPLAY_FALLBACKS,
};

const DEPOSIT_ENTRY_DOMAIN_ADAPTER: RecordDomainAdapter = {
  entity: { singular: "Entrada", plural: "Entradas" },
  detail: {
    createTitle: "Nova entrada",
    fallbackTitle: "Entrada",
  },
  fields: {
    ...Object.fromEntries(
      Object.entries(DEPOSIT_ENTRY_AUDIT_FIELD_LABELS).map(([field, label]) => [
        field,
        { label },
      ]),
    ),
    donorId: { label: "Fonte", type: "uuid", emptyValueLabel: "Sem fonte" },
    sector: { label: "Setor" },
    quantity: { label: "Quantidade", type: "number" },
    unit: { label: "Unidade" },
    entryDate: { label: "Data da entrada", type: "date" },
    expiryDate: {
      label: "Status",
      type: "date",
      emptyValueLabel: "Sem data limite",
    },
    notes: { label: "Notas", placeholder: "Notas (opcional)" },
  },
  validations: {
    sector: { required: true, minLength: 1 },
    quantity: { required: true, min: 0.000001 },
    unit: { required: true, minLength: 1 },
  },
  displayFallbacks: DEPOSIT_DISPLAY_FALLBACKS,
};

const DEPOSIT_EXIT_DOMAIN_ADAPTER: RecordDomainAdapter = {
  entity: { singular: "Saída", plural: "Saídas" },
  detail: {
    createTitle: "Nova saída",
    fallbackTitle: "Saída",
  },
  fields: {
    ...Object.fromEntries(
      Object.entries(DEPOSIT_EXIT_AUDIT_FIELD_LABELS).map(([field, label]) => [
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
    destinationName: { label: "Destino", emptyValueLabel: "Sem destino" },
    notes: { label: "Notas", placeholder: "Notas (opcional)" },
  },
  validations: {
    sector: { required: true, minLength: 1 },
    quantity: { required: true, min: 0.000001 },
    unit: { required: true, minLength: 1 },
  },
  displayFallbacks: DEPOSIT_DISPLAY_FALLBACKS,
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
          { field: "name", label: "Objeto", kind: "dimension" },
          { field: "sector", label: "Setor", kind: "dimension", emptyValueLabel: "Geral" },
          { field: "group", label: "Grupo", kind: "dimension", emptyValueLabel: "Sem grupo" },
          { field: "unit", label: "Unidade", kind: "dimension" },
          { field: "validityStatus", label: "Status", kind: "dimension" },
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
      groupByFields: ["kind", "sector", "type", "destinationName", "donorName"],
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
              typeof value === "string" && value in DEPOSIT_EXIT_TYPE_LABELS
                ? DEPOSIT_EXIT_TYPE_LABELS[value as keyof typeof DEPOSIT_EXIT_TYPE_LABELS]
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
          { field: "destinationName", label: "Destino", kind: "dimension", emptyValueLabel: "Sem destino" },
          { field: "donorName", label: "Fonte", kind: "dimension", emptyValueLabel: "Sem fonte" },
          { field: "actor", label: "Usuário", kind: "dimension", emptyValueLabel: "Sistema" },
          { field: "movementDate", label: "Data do movimento", kind: "date" },
          { field: "expiryDate", label: "Status", kind: "date" },
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

const STOCK_DEFAULT_QUERY_STATE: DepositStockQueryState = {
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

const HISTORY_DEFAULT_QUERY_STATE: DepositHistoryQueryState = {
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

const DONORS_DEFAULT_QUERY_STATE: DepositDonorsQueryState = {
  view: "list",
  searchText: "",
  domain: null,
  groupBy: [],
  pageIndex: 0,
  pageSize: 50,
};

const DETAIL_DEFAULT_QUERY_STATE: DepositDetailQueryState = {
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

export const depositStockModuleDefinition =
  defineRecordModule<DepositStockQueryState>({
    moduleId: "deposit.stock",
    basePath: DEPOSIT_ROUTES.stock,
    featureFlags: STOCK_FEATURE_FLAGS,
    actionKey: DEPOSIT_SCREEN_STATE_KEYS.stock,
    favoriteKey: DEPOSIT_ACTION_IDS.stock,
    permissions: DEPOSIT_BASE_PERMISSIONS,
    actions: DEPOSIT_STOCK_ACTIONS,
    queryAdapters: {
      listDataProvider: { model: "deposit.stock" },
    },
    domainAdapter: DEPOSIT_STOCK_DOMAIN_ADAPTER,
    searchConfig: depositStockSearchView,
    views: STOCK_VIEWS,
    defaultView: "list",
    defaultQueryState: STOCK_DEFAULT_QUERY_STATE,
  });

export const depositHistoryModuleDefinition =
  defineRecordModule<DepositHistoryQueryState>({
    moduleId: "deposit.history",
    basePath: DEPOSIT_ROUTES.history,
    featureFlags: HISTORY_FEATURE_FLAGS,
    actionKey: DEPOSIT_SCREEN_STATE_KEYS.history,
    favoriteKey: DEPOSIT_ACTION_IDS.history,
    permissions: DEPOSIT_BASE_PERMISSIONS,
    actions: DEPOSIT_HISTORY_ACTIONS,
    queryAdapters: {
      listDataProvider: { model: "deposit.history" },
    },
    domainAdapter: DEPOSIT_HISTORY_DOMAIN_ADAPTER,
    searchConfig: depositHistorySearchView,
    views: HISTORY_VIEWS,
    defaultView: "list",
    defaultQueryState: HISTORY_DEFAULT_QUERY_STATE,
  });

export const depositDonorsModuleDefinition =
  defineRecordModule<DepositDonorsQueryState>({
    moduleId: "deposit.donors",
    basePath: DEPOSIT_ROUTES.donors,
    featureFlags: DONOR_LIST_FEATURE_FLAGS,
    actionKey: DEPOSIT_SCREEN_STATE_KEYS.donors,
    favoriteKey: DEPOSIT_ACTION_IDS.donors,
    permissions: DEPOSIT_BASE_PERMISSIONS,
    actions: DEPOSIT_DONOR_ACTIONS,
    queryAdapters: {
      listDataProvider: { model: "deposit.donors" },
    },
    domainAdapter: DEPOSIT_DONOR_DOMAIN_ADAPTER,
    searchConfig: depositDonorsSearchView,
    views: DONOR_LIST_VIEWS,
    defaultView: "list",
    defaultQueryState: DONORS_DEFAULT_QUERY_STATE,
  });

export const depositItemDetailModuleDefinition = defineRecordModule<
  DepositDetailQueryState,
  DepositItemDetailLayoutContext
>({
  moduleId: "deposit.item",
  basePath: DEPOSIT_ROUTES.items,
  featureFlags: DETAIL_FEATURE_FLAGS,
  actionKey: DEPOSIT_SCREEN_STATE_KEYS.itemsDetail,
  favoriteKey: DEPOSIT_ACTION_IDS.itemsDetail,
  permissions: DEPOSIT_BASE_PERMISSIONS,
  actions: DEPOSIT_ITEM_DETAIL_ACTIONS,
  queryAdapters: {
    listDataProvider: { model: "deposit.stock" },
    detailDataProvider: { model: "deposit.items" },
    auditDataProvider: { model: "deposit.items.audit" },
  },
  domainAdapter: DEPOSIT_ITEM_DOMAIN_ADAPTER,
  searchConfig: depositStockSearchView,
  views: DETAIL_VIEWS,
  defaultView: "detail",
  defaultQueryState: DETAIL_DEFAULT_QUERY_STATE,
  detailLayout: depositItemDetailLayout,
  relatedSources: [
    {
      key: "entries",
      label: "Entradas",
      viewType: "list",
      dataSource: "deposit.entries",
      count: (context) => context.entryRows.length,
      onOpen: (context, entityId) => context.onOpenEntry(entityId),
    },
    {
      key: "exits",
      label: "Saídas",
      viewType: "list",
      dataSource: "deposit.exits",
      count: (context) => context.exitRows.length,
      onOpen: (context, entityId) => context.onOpenExit(entityId),
    },
    {
      key: "history",
      label: "Histórico",
      viewType: "list",
      dataSource: "deposit.history",
      count: (context) => context.historyRows.length,
    },
  ],
});

export const depositDonorDetailModuleDefinition = defineRecordModule<
  DepositDetailQueryState,
  DepositDonorDetailLayoutContext
>({
  moduleId: "deposit.donor",
  basePath: DEPOSIT_ROUTES.donors,
  featureFlags: {
    ...DETAIL_FEATURE_FLAGS,
  },
  actionKey: DEPOSIT_SCREEN_STATE_KEYS.donorsDetail,
  favoriteKey: DEPOSIT_ACTION_IDS.donorsDetail,
  permissions: DEPOSIT_BASE_PERMISSIONS,
  actions: DEPOSIT_DONOR_DETAIL_ACTIONS,
  queryAdapters: {
    listDataProvider: { model: "deposit.donors" },
    detailDataProvider: { model: "deposit.donors" },
    auditDataProvider: { model: "deposit.donors.audit" },
  },
  domainAdapter: DEPOSIT_DONOR_DOMAIN_ADAPTER,
  searchConfig: depositDonorsSearchView,
  views: DETAIL_VIEWS,
  defaultView: "detail",
  defaultQueryState: DETAIL_DEFAULT_QUERY_STATE,
  detailLayout: depositDonorDetailLayout,
  relatedSources: [
    {
      key: "donations",
      viewType: "list",
      dataSource: "deposit.entries",
      label: "Doacões",
      count: (context) => context.entries.length,
      onOpen: (context, entityId) => context.onOpenEntry(entityId),
    },
  ],
});

export const depositEntryDetailModuleDefinition = defineRecordModule<
  DepositDetailQueryState,
  DepositEntryDetailLayoutContext
>({
  moduleId: "deposit.entry",
  basePath: DEPOSIT_ROUTES.entries,
  featureFlags: {
    ...DETAIL_FEATURE_FLAGS,
  },
  actionKey: DEPOSIT_SCREEN_STATE_KEYS.entriesDetail,
  favoriteKey: DEPOSIT_ACTION_IDS.entriesDetail,
  permissions: DEPOSIT_BASE_PERMISSIONS,
  actions: DEPOSIT_ENTRY_DETAIL_ACTIONS,
  queryAdapters: {
    listDataProvider: { model: "deposit.entries" },
    detailDataProvider: { model: "deposit.entries" },
    auditDataProvider: { model: "deposit.entries.audit" },
  },
  domainAdapter: DEPOSIT_ENTRY_DOMAIN_ADAPTER,
  searchConfig: depositEntriesSearchView,
  views: DETAIL_VIEWS,
  defaultView: "detail",
  defaultQueryState: DETAIL_DEFAULT_QUERY_STATE,
  detailLayout: depositEntryDetailLayout,
  relatedSources: [
    {
      key: "allocatedExits",
      label: "Saídas vinculadas",
      viewType: "list",
      dataSource: "deposit.exits",
      count: (context) => context.allocatedExits.length,
      onOpen: (context, entityId) => context.onOpenExit(entityId),
    },
  ],
});

export const depositExitDetailModuleDefinition = defineRecordModule<
  DepositDetailQueryState,
  DepositExitDetailLayoutContext
>({
  moduleId: "deposit.exit",
  basePath: DEPOSIT_ROUTES.exits,
  featureFlags: {
    ...DETAIL_FEATURE_FLAGS,
  },
  actionKey: DEPOSIT_SCREEN_STATE_KEYS.exitsDetail,
  favoriteKey: DEPOSIT_ACTION_IDS.exitsDetail,
  permissions: DEPOSIT_BASE_PERMISSIONS,
  actions: DEPOSIT_EXIT_DETAIL_ACTIONS,
  queryAdapters: {
    listDataProvider: { model: "deposit.exits" },
    detailDataProvider: { model: "deposit.exits" },
    auditDataProvider: { model: "deposit.exits.audit" },
  },
  domainAdapter: DEPOSIT_EXIT_DOMAIN_ADAPTER,
  searchConfig: depositExitsSearchView,
  views: DETAIL_VIEWS,
  defaultView: "detail",
  defaultQueryState: DETAIL_DEFAULT_QUERY_STATE,
  detailLayout: depositExitDetailLayout,
  relatedSources: [
    {
      key: "allocations",
      label: "Lotes vinculados",
      viewType: "list",
      dataSource: "deposit.entries",
      count: (context) => context.exit?.allocations?.length ?? 0,
      onOpen: (context, entityId) => context.onOpenEntry(entityId),
    },
  ],
});

export type DepositModuleDefinition =
  | RecordModuleDefinition<DepositStockQueryState>
  | RecordModuleDefinition<DepositHistoryQueryState>
  | RecordModuleDefinition<DepositDonorsQueryState>
  | RecordModuleDefinition<
      DepositDetailQueryState,
      DepositItemDetailLayoutContext
    >
  | RecordModuleDefinition<
      DepositDetailQueryState,
      DepositDonorDetailLayoutContext
    >
  | RecordModuleDefinition<
      DepositDetailQueryState,
      DepositEntryDetailLayoutContext
    >
  | RecordModuleDefinition<
      DepositDetailQueryState,
      DepositExitDetailLayoutContext
    >;

