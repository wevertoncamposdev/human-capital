import type { BreadcrumbItem } from "@/components/layout/BreadcrumbContext";
import type * as React from "react";
import type { LucideIcon } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Domain, DomainOperator } from "@/web-client/domain/types";
import type {
  SearchFieldOption,
  SearchFieldType,
  SearchViewDefinition,
} from "@/web-client/search/types";
import type { SortDirection as DomainSortDirection } from "@/web-client/data-provider/types";
import { getStandardViewIcon } from "@/web-client/registry/view-icons";
import type { GraphChartType } from "@/web-client/views/GraphView";

export type ViewType =
  | "detail"
  | "list"
  | "grouped"
  | "table"
  | "kanban"
  | "gantt"
  | "form"
  | "timeline"
  | "calendar"
  | "graph";

export type PermissionRequirement =
  | string
  | string[]
  | {
      allOf?: string[];
      anyOf?: string[];
    };

export type WindowActionView = {
  type: ViewType;
  label: string;
  icon?: LucideIcon;
};

export type WindowActionModuleDefinition = {
  defaultView?: string;
  permissions?: ModulePermissionMap;
  actions?: RecordModuleActionMap;
  domainAdapter?: RecordDomainAdapter;
  detailLayout?: {
    editing?: DetailEditingConfig;
  };
  views: ViewConfig[];
};

export type WindowAction = {
  id: string;
  title: string;
  breadcrumbs: BreadcrumbItem[];
  permissions?: PermissionRequirement;
  moduleActionKey?: string;
  modulePermissionKey?: ModulePermissionKey;
  defaultViewType?: ViewType;
  views?: WindowActionView[];
  actionSlot?: React.ReactNode;
  render: () => React.ReactNode;
  moduleDefinition?: WindowActionModuleDefinition;
  hideBreadcrumb?: boolean;
};

export type RecordQueryState = {
  view: string;
  searchText: string;
  domain: Domain;
  groupBy: string[];
  pageIndex: number;
  pageSize: number;
  sort?: Array<{
    field: string;
    direction: SortDirection;
  }>;
  selectedIds?: string[];
  [key: string]: unknown;
};

export type ModulePermissionMap = Partial<{
  canRead: PermissionRequirement;
  canCreate: PermissionRequirement;
  canEdit: PermissionRequirement;
  canDelete: PermissionRequirement;
  canShare: PermissionRequirement;
  canAudit: PermissionRequirement;
  canExport: PermissionRequirement;
}> &
  Record<string, PermissionRequirement | undefined>;

export type ModulePermissionKey = keyof ModulePermissionMap;

export type RecordDetailShellText = Partial<{
  createSubtitle: string;
  detailsSubtitle: string;
  save: string;
  saving: string;
  loading: string;
  ready: string;
  closeAria: string;
  closeTitle: string;
}>;

export type ViewSupportConfig = {
  supportsCreate?: boolean;
  supportsQuickCreate?: boolean;
  supportsSelection?: boolean;
  supportsExport?: boolean;
  supportsSearch?: boolean;
  supportsGrouping?: boolean;
  supportsPagination?: boolean;
  supportsSort?: boolean;
};

export type DetailAutoSaveConfig = Partial<{
  trigger: "field-commit";
}>;

export type DetailEditingConfig = Partial<{
  saveMode: "manual" | "auto";
  autoSave: DetailAutoSaveConfig;
}>;

type BaseViewConfig<TViewType extends ViewType, TParams extends Record<string, unknown>> = {
  id: string;
  title: string;
  icon?: React.ReactNode;
  viewType: TViewType;
  permissions?: PermissionRequirement;
  params?: TParams;
  isDefault?: boolean;
  supports?: ViewSupportConfig;
  featureFlag?: string;
};

export type ListViewConfig = BaseViewConfig<
  "list" | "table",
  Partial<{
    searchable: true;
    sortable: true;
    paginated: true;
    sortFields: string[];
  }>
>;

export type GroupedViewConfig = BaseViewConfig<
  "grouped",
  {
    groupByFields: string[];
    defaultGroupBy?: string[];
  }
>;

export type CalendarMode = "day" | "week" | "month" | "year";
export type GanttScale = "week" | "month" | "quarter";

export type TimelineViewConfig = BaseViewConfig<
  "timeline",
  {
    startDateField: string;
    endDateField?: string;
    titleField?: string;
    dateFields?: string[];
    defaultDateField?: string;
    sortDirections?: SortDirection[];
    defaultSortDirection?: SortDirection;
  }
>;

export type CalendarViewConfig = BaseViewConfig<
  "calendar",
  {
    startDateField: string;
    endDateField?: string;
    titleField?: string;
    dateFields?: string[];
    defaultDateField?: string;
    modes?: CalendarMode[];
    defaultMode?: CalendarMode;
  }
>;

export type KanbanViewConfig = BaseViewConfig<
  "kanban",
  {
    columnField: string;
    titleField?: string;
    groupByFields?: string[];
    defaultGroupByField?: string;
  }
>;

export type GanttViewConfig = BaseViewConfig<
  "gantt",
  {
    startDateField: string;
    endDateField?: string;
    titleField?: string;
    progressField?: string;
    groupByFields?: string[];
    defaultGroupByField?: string;
    scaleOptions?: GanttScale[];
    defaultScale?: GanttScale;
  }
>;

export type GraphMetricOp =
  | "count"
  | "sum"
  | "avg"
  | "min"
  | "max"
  | "distinct_count";

export type GraphTimeBucket = "day" | "week" | "month" | "quarter" | "year";

export type GraphBuilderFieldKind = "dimension" | "metric" | "date";

export type GraphBuilderFilterValue =
  | string
  | number
  | boolean
  | string[]
  | null
  | undefined;

export type GraphBuilderFieldConfig = {
  field: string;
  label: string;
  kind: GraphBuilderFieldKind;
  allowedOps?: GraphMetricOp[];
  emptyValueLabel?: string;
  getValue?: (row: Record<string, unknown>) => unknown;
  formatValue?: (value: unknown, row?: Record<string, unknown>) => string;
  getSortValue?: (value: unknown, row?: Record<string, unknown>) => string | number;
};

export type GraphBuilderFilterConfig = {
  id: string;
  field: string;
  label: string;
  operator: DomainOperator;
  type?: SearchFieldType;
  placeholder?: string;
  options?:
    | SearchFieldOption[]
    | ((rows: Array<Record<string, unknown>>) => SearchFieldOption[]);
};

export type GraphBuilderState = {
  groupBy: string;
  metric: {
    field: string | null;
    op: GraphMetricOp;
  };
  timeField: string | null;
  timeBucket: GraphTimeBucket | null;
  chartType: GraphChartType;
  filters?: Record<string, GraphBuilderFilterValue>;
};

export type GraphBuilderConfig = {
  fields: GraphBuilderFieldConfig[];
  defaultState: GraphBuilderState;
  filters?: GraphBuilderFilterConfig[];
  maxGroups?: number;
  emptyState?: string;
  downloadFileName?: string;
};

export type GraphViewConfig = BaseViewConfig<
  "graph",
  {
    builder: GraphBuilderConfig;
  }
>;

export type DetailViewConfig = BaseViewConfig<
  "detail",
  Partial<{
    usesDetailShell: true;
  }>
>;

export type FormViewConfig = BaseViewConfig<
  "form",
  Partial<{
    titleField: string;
  }>
>;

export type ViewConfig =
  | ListViewConfig
  | GroupedViewConfig
  | TimelineViewConfig
  | CalendarViewConfig
  | KanbanViewConfig
  | GanttViewConfig
  | GraphViewConfig
  | DetailViewConfig
  | FormViewConfig;

export type RecordQueryAdapter = {
  model: string;
  context?: Record<string, unknown>;
};

export type RecordQueryAdapters = {
  listDataProvider: RecordQueryAdapter;
  detailDataProvider?: RecordQueryAdapter;
  notesDataProvider?: RecordQueryAdapter;
  commentsDataProvider?: RecordQueryAdapter;
  tagsDataProvider?: RecordQueryAdapter;
  attachmentsDataProvider?: RecordQueryAdapter;
  historyDataProvider?: RecordQueryAdapter;
  auditDataProvider?: RecordQueryAdapter;
};

export type RecordDataSourceConfig = RecordQueryAdapters;

export type ModuleFeatureFlagMap = Partial<
  Record<
    | "list"
    | "detail"
    | "notes"
    | "comments"
    | "tags"
    | "attachments"
    | "media"
    | "history"
    | "context"
    | "audit"
    | "grouped"
    | "timeline"
    | "calendar"
    | "kanban"
    | "gantt"
    | "graph"
    | "export"
    | "share",
    boolean
  >
> &
  Record<string, boolean | undefined>;

export type DetailCommentUser = {
  id: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
};

export type DetailCommentItem = {
  id: string;
  body: string;
  mentionUserIds: string[];
  author: {
    id: string | null;
    name: string;
    email?: string | null;
    avatarUrl?: string | null;
  };
  createdAt: string;
  updatedAt?: string;
};

export type DetailCommentDraft = {
  body: string;
  mentionUserIds: string[];
};

export type DetailContextItem = {
  key: string;
  label: string;
  value: React.ReactNode;
  tone?: "default" | "muted" | "positive" | "warning" | "danger";
};

export type DetailSummaryMetric = {
  key: string;
  label: string;
  value: React.ReactNode;
  helperText?: React.ReactNode;
};

export type DetailHistoryItem = {
  id: string;
  title: string;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  createdAt?: string | null;
  tone?: "default" | "muted" | "positive" | "warning" | "danger";
};

export type DetailAttachmentItem = {
  id: string;
  label: string;
  description?: React.ReactNode;
  href?: string | null;
  createdAt?: string | null;
  mimeType?: string | null;
  sizeLabel?: string | null;
  statusLabel?: string | null;
};

export type DetailMetadataPermissions = Partial<{
  canViewOwnAudit: boolean;
  canViewAllAudit: boolean;
  canReadNotes: boolean;
  canWriteNotes: boolean;
  canReadComments: boolean;
  canWriteComments: boolean;
  canReadTags: boolean;
  canWriteTags: boolean;
  canReadAttachments: boolean;
  canWriteAttachments: boolean;
  canReadHistory: boolean;
}>;

export type StandardDetailMetadataConfig<
  TContext extends Record<string, unknown> = Record<string, unknown>,
> = Partial<{
  defaultTab:
    | "activity"
    | "comments"
    | "notes"
    | "tags"
    | "attachments"
    | "history"
    | "context";
  permissions: (context: TContext) => DetailMetadataPermissions;
  contextItems: (context: TContext) => DetailContextItem[];
  summaryMetrics: (context: TContext) => DetailSummaryMetric[];
  comments: {
    users: (context: TContext) => DetailCommentUser[];
    items: (context: TContext) => DetailCommentItem[];
    draft: (context: TContext) => DetailCommentDraft;
    onDraftChange: (
      context: TContext,
      updater: DetailCommentDraft | ((previous: DetailCommentDraft) => DetailCommentDraft),
    ) => void;
    onSubmit: (context: TContext) => void;
    onDelete?: (commentId: string, context: TContext) => void;
    submitting?: (context: TContext) => boolean;
    emptyLabel?: string | ((context: TContext) => string);
  };
  notes: {
    value: (context: TContext) => string | null | undefined;
    onChange: (next: string | null, context: TContext) => void;
    onBlur: (context: TContext) => void;
    placeholder?: string;
  };
  tags: {
    value: (context: TContext) => string[];
    onChange: (next: string[], context: TContext) => void;
    onCommit?: (next: string[], context: TContext) => void;
    emptyLabel?: string;
  };
  attachments: {
    items: (context: TContext) => DetailAttachmentItem[];
    onOpen?: (attachmentId: string, context: TContext) => void;
    onUpload?: (context: TContext) => void;
    emptyLabel?: string | ((context: TContext) => string);
  };
  history: {
    items: (context: TContext) => DetailHistoryItem[];
    emptyLabel?: string | ((context: TContext) => string);
  };
}>;

export type AuditSourceConfig<
  TContext extends Record<string, unknown> = Record<string, unknown>,
> = {
  key: string;
  entity: string;
  model: string;
  label: string;
  joinKey?: string;
  idField?: string;
  fieldLabels?: Record<string, string>;
  valueFormatters?: Record<
    string,
    (value: unknown, options: {
      field: string;
      entity: string;
      sourceKey: string;
      sourceLabel: string;
      context: TContext;
    }) => string
  >;
  resolveEntityId?: (context: TContext) => string | null | undefined;
  resolveEntityIds?: (context: TContext) => string[];
};

export type SortDirection = DomainSortDirection;

export type AuditFeedConfig<
  TContext extends Record<string, unknown> = Record<string, unknown>,
> = {
  primaryEntity: AuditSourceConfig<TContext>;
  relatedEntities?: AuditSourceConfig<TContext>[];
  sort?: Array<{
    field: string;
    direction: SortDirection;
  }>;
  filters?:
    | Record<string, unknown>
    | ((context: TContext) => Record<string, unknown>);
  pagination?: {
    pageIndex?: number;
    pageSize?: number;
    limit?: number;
  };
  transform?: (input: unknown) => unknown;
};

export type ModuleActionDefinition = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  permission?: PermissionRequirement;
  permissionKey?: ModulePermissionKey;
  scope?: "global" | "list" | "row" | "detail" | "relation";
  variant?: "primary" | "secondary" | "ghost" | "destructive";
  requiresReturnTo?: boolean;
  returnToParam?: string;
};

export type RecordModuleActionMap = Partial<
  Record<
    | "create"
    | "view"
    | "edit"
    | "delete"
    | "share"
    | "export"
    | "audit"
    | "refresh"
    | "quickCreate",
    ModuleActionDefinition
  >
> &
  Record<string, ModuleActionDefinition | undefined>;

export type DomainFieldAdapter = {
  label: string;
  type?: string;
  placeholder?: string;
  emptyValueLabel?: string;
  mask?: string;
  description?: string;
};

export type DomainValidationAdapter = Partial<{
  required: boolean;
  min: number;
  max: number;
  minLength: number;
  maxLength: number;
  pattern: string;
  message: string;
}>;

export type RecordDomainAdapter = {
  entity: {
    singular: string;
    plural: string;
  };
  list?: {
    searchPlaceholder?: string;
    createActionLabel?: string;
    totalLabel?: string;
    emptyStateLabel?: string;
  };
  detail?: {
    createTitle?: string;
    fallbackTitle?: string;
    shellLabels?: RecordDetailShellText;
  };
  fields?: Record<string, DomainFieldAdapter>;
  validations?: Record<string, DomainValidationAdapter>;
  displayFallbacks?: Partial<{
    emptyText: string;
    emptyDate: string;
    emptyNumber: string;
    emptyRelation: string;
  }>;
};

export type DetailRelatedSourceConfig<TContext> = {
  key: string;
  label: string;
  viewType?: string;
  dataSource?: string;
  count?: (context: TContext) => number | undefined;
  onOpen?: (context: TContext, entityId: string) => void;
};

export type DetailRelationActionConfig<TContext> = {
  label: string;
  icon?: React.ReactNode;
  onClick: (context: TContext) => void;
  disabled?: (context: TContext) => boolean;
  hidden?: (context: TContext) => boolean;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
};

export type DetailRelationFilterOption = {
  label: string;
  value: string;
};

export type DetailRelationSelectFilterConfig<
  TContext extends Record<string, unknown> = Record<string, unknown>,
> = {
  key: string;
  label: string;
  type: "select";
  value: (context: TContext) => string;
  onChange: (context: TContext, value: string) => void;
  options: (context: TContext) => DetailRelationFilterOption[];
  placeholder?: string | ((context: TContext) => string);
  hidden?: (context: TContext) => boolean;
  disabled?: (context: TContext) => boolean;
};

export type DetailRelationFilterConfig<
  TContext extends Record<string, unknown> = Record<string, unknown>,
> = DetailRelationSelectFilterConfig<TContext>;

export type DetailRelationStatConfig<
  TContext extends Record<string, unknown> = Record<string, unknown>,
  TRow = unknown,
> = {
  key: string;
  label: string;
  value: (context: TContext, rows: TRow[]) => React.ReactNode;
  hidden?: (context: TContext) => boolean;
};

export type DetailRelationBulkActionConfig<
  TContext extends Record<string, unknown> = Record<string, unknown>,
  TRow = unknown,
> = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (context: TContext, rows: TRow[]) => void;
  disabled?: (context: TContext, rows: TRow[]) => boolean;
  hidden?: (context: TContext, rows: TRow[]) => boolean;
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
};

export type DetailRelationSelectionConfig<
  TContext extends Record<string, unknown> = Record<string, unknown>,
  TRow = unknown,
> = Partial<{
  mode: "always" | "toggle";
  enabled: (context: TContext) => boolean;
  toggleLabel: string | ((context: TContext, active: boolean) => string);
  bulkActions: DetailRelationBulkActionConfig<TContext, TRow>[];
}>;

export type DetailOperationalRelationConfig<
  TContext extends Record<string, unknown> = Record<string, unknown>,
  TRow = unknown,
> = Partial<{
  filters: DetailRelationFilterConfig<TContext>[];
  stats: DetailRelationStatConfig<TContext, TRow>[];
  primaryAction: DetailRelationActionConfig<TContext>;
  secondaryActions: DetailRelationActionConfig<TContext>[];
  selection: DetailRelationSelectionConfig<TContext, TRow>;
}>;

export type DetailRelationConfig<
  TContext extends Record<string, unknown> = Record<string, unknown>,
  TRow = unknown,
> = {
  key: string;
  label: string;
  description?: string;
  variant?: "informational" | "operational";
  visible?: (context: TContext) => boolean;
  loading?: (context: TContext) => boolean;
  error?: string | ((context: TContext) => string | null | undefined);
  rows: (context: TContext) => TRow[];
  columns:
    | ColumnDef<TRow, unknown>[]
    | ((context: TContext) => ColumnDef<TRow, unknown>[]);
  getRowId?: (row: TRow, index: number) => string;
  onRowClick?: (row: TRow, context: TContext) => void;
  renderCard?: (row: TRow, context: TContext) => React.ReactNode;
  emptyLabel?: string | ((context: TContext) => string);
  groupBy?: (context: TContext) => string[];
  searchable?: boolean;
  searchPlaceholder?: string | ((context: TContext) => string);
  filterRows?: (rows: TRow[], query: string, context: TContext) => TRow[];
  action?: DetailRelationActionConfig<TContext>;
} & DetailOperationalRelationConfig<TContext, TRow>;

export type DetailTabTemplate<
  TContext extends Record<string, unknown> = Record<string, unknown>,
> = {
  key: string;
  label: string;
  visible?: (context: TContext) => boolean;
  badge?: (context: TContext) => React.ReactNode;
  content?: (context: TContext) => React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  relations?: DetailRelationConfig<TContext, any>[];
  emptyLabel?: string;
};

export type DetailLayoutConfig<
  TContext extends Record<string, unknown> = Record<string, unknown>,
> = {
  editing?: DetailEditingConfig;
  header?: {
    title?: (context: TContext) => string;
    leadingSlot?: (context: TContext) => React.ReactNode;
    slot?: (context: TContext) => React.ReactNode;
  };
  headerSlot?: (context: TContext) => React.ReactNode;
  main?: (context: TContext) => React.ReactNode;
  mainSlot?: (context: TContext) => React.ReactNode;
  tabs?: (context: TContext) => React.ReactNode;
  tabTemplates?: DetailTabTemplate<TContext>[];
  bottom?: (context: TContext) => React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bottomRelations?: DetailRelationConfig<TContext, any>[];
  side?: (context: TContext) => React.ReactNode;
  sideSlot?: (context: TContext) => React.ReactNode;
  viewControls?: (context: TContext) => React.ReactNode;
  auditSources?: AuditFeedConfig<TContext>;
  metadata?: StandardDetailMetadataConfig<TContext>;
};

export type RecordModuleDefinition<
  TState extends RecordQueryState = RecordQueryState,
  TContext extends Record<string, unknown> = Record<string, unknown>,
> = {
  moduleId: string;
  basePath: string;
  featureFlags?: ModuleFeatureFlagMap;
  actionKey: string;
  favoriteKey: string;
  permissions?: ModulePermissionMap;
  actions?: RecordModuleActionMap;
  queryAdapters: RecordQueryAdapters;
  domainAdapter?: RecordDomainAdapter;
  searchConfig: SearchViewDefinition;
  views: ViewConfig[];
  defaultView: TState["view"];
  defaultQueryState: TState;
  detailLayout?: DetailLayoutConfig<TContext>;
  relatedSources?: DetailRelatedSourceConfig<TContext>[];
};

export function defineRecordModule<
  TState extends RecordQueryState,
  TContext extends Record<string, unknown> = Record<string, unknown>,
>(definition: RecordModuleDefinition<TState, TContext>) {
  const normalizedDefinition = normalizeRecordModuleDefinition(definition);
  if (process.env.NODE_ENV !== "production") {
    validateRecordModuleDefinition(normalizedDefinition);
  }
  return normalizedDefinition;
}

function normalizeRecordModuleDefinition<
  TState extends RecordQueryState,
  TContext extends Record<string, unknown> = Record<string, unknown>,
>(definition: RecordModuleDefinition<TState, TContext>) {
  return {
    ...definition,
    views: definition.views.map((view) => ({
      ...view,
      icon: getStandardViewIcon(view.viewType),
    })),
  };
}

export function validateRecordModuleDefinition<
  TState extends RecordQueryState,
  TContext extends Record<string, unknown> = Record<string, unknown>,
>(definition: RecordModuleDefinition<TState, TContext>) {
  if (!definition.moduleId.trim()) {
    throw new Error("RecordModuleDefinition.moduleId is required.");
  }

  if (!definition.actionKey.trim()) {
    throw new Error(`Module ${definition.moduleId} requires actionKey.`);
  }

  if (!definition.favoriteKey.trim()) {
    throw new Error(`Module ${definition.moduleId} requires favoriteKey.`);
  }

  if (!definition.queryAdapters.listDataProvider?.model?.trim()) {
    throw new Error(`Module ${definition.moduleId} requires listDataProvider.model.`);
  }

  if (!definition.views.length) {
    throw new Error(`Module ${definition.moduleId} requires at least one view.`);
  }

  const viewIds = new Set<string>();
  definition.views.forEach((view) => {
    if (viewIds.has(view.id)) {
      throw new Error(`Module ${definition.moduleId} has duplicated view id "${view.id}".`);
    }
    viewIds.add(view.id);

    if (!view.id.trim()) {
      throw new Error(`Module ${definition.moduleId} requires a non-empty view id.`);
    }

    if (!view.title.trim()) {
      throw new Error(
        `Module ${definition.moduleId} view "${view.id}" requires a non-empty title.`,
      );
    }

    if (view.viewType === "grouped") {
      const groupByFields = view.params?.groupByFields ?? [];
      if (!groupByFields.length) {
        throw new Error(
          `Module ${definition.moduleId} grouped view "${view.id}" requires groupByFields.`,
        );
      }
    }

    if (view.viewType === "kanban") {
      const columnField = view.params?.columnField?.trim();
      if (!columnField) {
        throw new Error(
          `Module ${definition.moduleId} kanban view "${view.id}" requires columnField.`,
        );
      }

      const groupByFields = view.params?.groupByFields ?? [];
      const uniqueGroupByFields = new Set(groupByFields);
      if (groupByFields.length !== uniqueGroupByFields.size) {
        throw new Error(
          `Module ${definition.moduleId} kanban view "${view.id}" has duplicated groupByFields.`,
        );
      }

      if (
        view.params?.defaultGroupByField &&
        !groupByFields.includes(view.params.defaultGroupByField)
      ) {
        throw new Error(
          `Module ${definition.moduleId} kanban view "${view.id}" defaultGroupByField must be declared in groupByFields.`,
        );
      }
    }

    if (view.viewType === "gantt") {
      const startDateField = view.params?.startDateField?.trim();
      if (!startDateField) {
        throw new Error(
          `Module ${definition.moduleId} gantt view "${view.id}" requires startDateField.`,
        );
      }

      const groupByFields = view.params?.groupByFields ?? [];
      const uniqueGroupByFields = new Set(groupByFields);
      if (groupByFields.length !== uniqueGroupByFields.size) {
        throw new Error(
          `Module ${definition.moduleId} gantt view "${view.id}" has duplicated groupByFields.`,
        );
      }

      if (
        view.params?.defaultGroupByField &&
        !groupByFields.includes(view.params.defaultGroupByField)
      ) {
        throw new Error(
          `Module ${definition.moduleId} gantt view "${view.id}" defaultGroupByField must be declared in groupByFields.`,
        );
      }
    }

    if (view.viewType === "graph") {
      const builder = view.params?.builder;
      if (!builder) {
        throw new Error(
          `Module ${definition.moduleId} graph view "${view.id}" requires builder.`,
        );
      }

      if (!builder.fields.length) {
        throw new Error(
          `Module ${definition.moduleId} graph view "${view.id}" requires builder.fields.`,
        );
      }

      const fieldNames = new Set<string>();
      builder.fields.forEach((field) => {
        if (fieldNames.has(field.field)) {
          throw new Error(
            `Module ${definition.moduleId} graph view "${view.id}" has duplicated builder field "${field.field}".`,
          );
        }

        fieldNames.add(field.field);
      });

      if (!fieldNames.has(builder.defaultState.groupBy)) {
        throw new Error(
          `Module ${definition.moduleId} graph view "${view.id}" defaultState.groupBy must reference a declared graph builder field.`,
        );
      }

      if (
        builder.defaultState.metric.field &&
        !fieldNames.has(builder.defaultState.metric.field)
      ) {
        throw new Error(
          `Module ${definition.moduleId} graph view "${view.id}" defaultState.metric.field must reference a declared graph builder field.`,
        );
      }

      if (builder.defaultState.timeField && !fieldNames.has(builder.defaultState.timeField)) {
        throw new Error(
          `Module ${definition.moduleId} graph view "${view.id}" defaultState.timeField must reference a declared graph builder field.`,
        );
      }

      const filterIds = new Set<string>();
      builder.filters?.forEach((filter) => {
        if (filterIds.has(filter.id)) {
          throw new Error(
            `Module ${definition.moduleId} graph view "${view.id}" has duplicated graph filter "${filter.id}".`,
          );
        }

        filterIds.add(filter.id);
      });
    }
  });

  if (!viewIds.has(definition.defaultView)) {
    throw new Error(
      `Module ${definition.moduleId} defaultView "${definition.defaultView}" is not declared in views.`,
    );
  }

  if (definition.defaultQueryState.view !== definition.defaultView) {
    throw new Error(
      `Module ${definition.moduleId} defaultQueryState.view must match defaultView.`,
    );
  }

  const searchFields = new Set<string>();
  definition.searchConfig.fields.forEach((field) => {
    if (searchFields.has(field.name)) {
      throw new Error(
        `Module ${definition.moduleId} searchConfig has duplicated field "${field.name}".`,
      );
    }
    searchFields.add(field.name);
  });

  const usesDetailView = definition.views.some((view) => view.viewType === "detail");
  if (usesDetailView && !definition.detailLayout) {
    throw new Error(`Module ${definition.moduleId} declares detail view without detailLayout.`);
  }

  if (definition.detailLayout?.auditSources && !definition.queryAdapters.auditDataProvider) {
    throw new Error(
      `Module ${definition.moduleId} declares auditSources without auditDataProvider.`,
    );
  }
}
