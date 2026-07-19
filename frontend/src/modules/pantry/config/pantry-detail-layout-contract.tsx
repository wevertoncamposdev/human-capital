"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { resolveMediaUrl } from "@/lib/api";
import { formatDateOnlyPtBR } from "@/lib/date";
import type {
  ApiPantryDonor,
  ApiPantryEntry,
  ApiPantryExit,
  ApiPantryHistoryMovement,
  ApiPantryItem,
} from "@/modules/pantry/api";
import type {
  ItemDraft,
  PantryItemDetailMode,
} from "@/modules/pantry/features/items/domain/pantry-item-detail.types";
import {
  formatAuditDate,
  formatAuditNumber,
  formatAuditReferenceLabel,
  normalizeSector,
  resolveExitTypeLabel,
} from "@/modules/pantry/features/items/domain/pantry-item-detail.helpers";
import { PantryItemDetailForm } from "@/modules/pantry/features/items/ui/detail/pantry-item-detail-form";
import {
  PANTRY_AUDIT_FIELD_LABELS,
  PANTRY_ENTRY_DONOR_NONE_VALUE,
  PANTRY_DONOR_TYPE_LABELS,
  PANTRY_DONOR_AUDIT_FIELD_LABELS,
  PANTRY_DEFAULT_SECTOR,
  PANTRY_ENTRY_AUDIT_FIELD_LABELS,
  PANTRY_EXIT_ENTRY_AUTO_VALUE,
  PANTRY_EXIT_AUDIT_FIELD_LABELS,
  PANTRY_EXIT_TYPE_OPTIONS,
  PANTRY_ITEM_UNIT,
} from "@/modules/pantry/shared/domain/pantry.constants";
import { DetailIdentityMediaField } from "@/web-client/detail/DetailIdentityMediaField";
import { StandardDetailMetadataSide } from "@/web-client/detail/StandardDetailMetadataSide";
import type { DetailShellAuditContext } from "@/web-client/detail/DetailShellEngine";
import type {
  DetailCommentDraft,
  DetailCommentUser,
  DetailHistoryItem,
  DetailLayoutConfig,
} from "@/web-client/registry/types";

type PantryMetadataContext = {
  mentionableUsers: DetailCommentUser[];
  commentDraft: DetailCommentDraft;
  onCommentDraftChange: React.Dispatch<React.SetStateAction<DetailCommentDraft>>;
  onSubmitComment: () => void;
  onDeleteComment?: (commentId: string) => void;
  commentSubmitting: boolean;
  tags: string[];
  onTagsChange: (next: string[]) => void;
  onTagsCommit?: (next: string[]) => void;
  internalNotes: string | null;
  onInternalNotesChange: (next: string | null) => void;
  onInternalNotesBlur: () => void;
  onUploadAttachment?: () => void;
  onDeleteAttachment?: (attachmentId: string) => void;
  attachmentUploading?: boolean;
  historyItems: DetailHistoryItem[];
};

export type PantryItemDetailLayoutContext = DetailShellAuditContext & PantryMetadataContext & {
  mode: PantryItemDetailMode;
  readOnly: boolean;
  draft: ItemDraft;
  setDraft: React.Dispatch<React.SetStateAction<ItemDraft>>;
  item: ApiPantryItem | null;
  onCommitField: (key: keyof ItemDraft) => void;
  onUnitChange: (value: string) => void;
  onGroupChange: (value: string | null) => void;
  sectorsLoading: boolean;
  sectorOptions: string[];
  onDefaultSectorChange: (value: string) => void;
  onOpenNewSector: () => void;
  entryRows: ApiPantryEntry[];
  exitRows: ApiPantryExit[];
  donorNameById: Record<string, string>;
  entryLabelById: Record<string, string>;
  exitLabelById: Record<string, string>;
  historyRows: ApiPantryHistoryMovement[];
  movementLoading: boolean;
  onNewEntry: () => void;
  onNewExit: () => void;
  onOpenEntry: (entryId: string) => void;
  onOpenExit: (exitId: string) => void;
  auditVisibleCount: number;
  onAuditVisibleCountChange: React.Dispatch<React.SetStateAction<number>>;
};

export type PantryDonorDraft = {
  name: string;
  type: ApiPantryDonor["type"];
  contact: string | null;
  avatarUrl: string | File | null;
};

export type PantryDonorDetailLayoutContext = DetailShellAuditContext & PantryMetadataContext & {
  mode: "create" | "edit";
  readOnly: boolean;
  avatarUploading: boolean;
  draft: PantryDonorDraft;
  setDraft: React.Dispatch<React.SetStateAction<PantryDonorDraft>>;
  onCommitField: (key: keyof PantryDonorDraft) => void;
  onTypeChange: (type: ApiPantryDonor["type"]) => void;
  onAvatarFileSelect: (file: File) => Promise<void> | void;
  donor: ApiPantryDonor | null;
  donorNameById: Record<string, string>;
  entries: ApiPantryEntry[];
  entriesLoading: boolean;
  auditVisibleCount: number;
  onAuditVisibleCountChange: React.Dispatch<React.SetStateAction<number>>;
  onOpenEntry: (entryId: string) => void;
};

export type PantryAllocatedExitRow = {
  exitId: string;
  exitDate: string;
  type: ApiPantryExit["type"];
  sector: string;
  quantity: number;
  unit: string;
  eventName: string | null;
  notes: string | null;
};

export type PantryExitAllocationRow = {
  entryId: string;
  quantity: number;
  expiryDate: string | null;
  sector: string;
  entryDate: string;
};

export type PantryEntryDraft = {
  donorId: string | null;
  sector: string;
  quantity: number;
  unit: string;
  entryDate: string;
  expiryDate: string;
  notes: string;
};

export type PantryEntryDetailLayoutContext = DetailShellAuditContext & PantryMetadataContext & {
  mode: "create" | "edit";
  readOnly: boolean;
  saving: boolean;
  draft: PantryEntryDraft;
  setDraft: React.Dispatch<React.SetStateAction<PantryEntryDraft>>;
  entry: ApiPantryEntry | null;
  donors: ApiPantryDonor[];
  donorsLoading: boolean;
  sectorsLoading: boolean;
  sectorOptions: string[];
  allocatedExitsLoading: boolean;
  allocatedExits: PantryAllocatedExitRow[];
  donorNameById: Record<string, string>;
  exitLabelById: Record<string, string>;
  canDelete: boolean;
  canCreateRelatedExit: boolean;
  onCommitField: (key: keyof PantryEntryDraft) => void;
  onPatch: (patch: Partial<PantryEntryDraft>) => void;
  onOpenNewSector: () => void;
  onOpenCreateDonor: () => void;
  onOpenCreateExit: () => void;
  onOpenExit: (exitId: string) => void;
  onDelete: () => void;
  auditVisibleCount: number;
  onAuditVisibleCountChange: React.Dispatch<React.SetStateAction<number>>;
};

export type PantryExitDraft = {
  entryId: string;
  sector: string;
  quantity: number;
  unit: string;
  exitDate: string;
  type: ApiPantryExit["type"];
  eventName: string;
  notes: string;
};

export type PantryExitDetailLayoutContext = DetailShellAuditContext & PantryMetadataContext & {
  mode: "create" | "edit";
  readOnly: boolean;
  saving: boolean;
  entryLocked: boolean;
  draft: PantryExitDraft;
  setDraft: React.Dispatch<React.SetStateAction<PantryExitDraft>>;
  exit: ApiPantryExit | null;
  entriesLoading: boolean;
  entries: ApiPantryEntry[];
  selectedEntry: ApiPantryEntry | null;
  sectorsLoading: boolean;
  sectorOptions: string[];
  donorNameById: Record<string, string>;
  entryLabelById: Record<string, string>;
  entryById: Record<string, ApiPantryEntry>;
  onCommitField: (key: keyof PantryExitDraft) => void;
  onPatch: (patch: Partial<PantryExitDraft>) => void;
  onOpenNewSector: () => void;
  onOpenEntry: (entryId: string) => void;
  onDelete: () => void;
  auditVisibleCount: number;
  onAuditVisibleCountChange: React.Dispatch<React.SetStateAction<number>>;
};

export const PANTRY_DETAIL_INPUT_CLASS =
  "h-10 rounded-none border-0 border-b border-border/70 bg-transparent px-0 text-sm shadow-none focus-visible:border-primary focus-visible:ring-0";

const PANTRY_DETAIL_BAND_CLASS =
  "border-y border-border/60 bg-transparent px-0 py-3";

const PANTRY_DETAIL_SECTION_CLASS =
  "border-y border-border/60 bg-transparent px-0 py-4";

const AUTO_SAVE_EDITING = {
  saveMode: "auto",
  autoSave: {
    trigger: "field-commit",
  },
} as const;

function resolveDonorAuditValue(
  donorNameById: Record<string, string>,
  value: unknown,
) {
  const donorId = typeof value === "string" ? value.trim() : "";
  if (!donorId) return "Sem doador";

  return formatAuditReferenceLabel(
    donorNameById[donorId],
    donorId,
    "Doador",
  );
}

function resolveDonorTypeAuditValue(value: unknown) {
  const donorType = typeof value === "string" ? value : "";
  return donorType && donorType in PANTRY_DONOR_TYPE_LABELS
    ? PANTRY_DONOR_TYPE_LABELS[donorType as keyof typeof PANTRY_DONOR_TYPE_LABELS]
    : donorType || "—";
}

function resolveAvatarAuditValue(value: unknown) {
  return typeof value === "string" && value.trim() ? "Foto definida" : "Sem foto";
}

function formatOptionalDate(value: string | null | undefined) {
  return value ? formatDateOnlyPtBR(value) : "—";
}

function resolveMovementKindLabel(kind: ApiPantryHistoryMovement["kind"]) {
  return kind === "ENTRY" ? "Entrada" : "Saída";
}

const pantryItemEntryRelationColumns: ColumnDef<ApiPantryEntry>[] = [
  {
    id: "entryDate",
    header: "Data",
    accessorKey: "entryDate",
    cell: ({ row }) => <div className="text-sm">{formatOptionalDate(row.original.entryDate)}</div>,
  },
  {
    id: "expiryDate",
    header: "Validade",
    accessorKey: "expiryDate",
    cell: ({ row }) => <div className="text-sm">{formatOptionalDate(row.original.expiryDate)}</div>,
  },
  {
    id: "sector",
    header: "Setor",
    accessorKey: "sector",
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">
        {row.original.sector || PANTRY_DEFAULT_SECTOR}
      </div>
    ),
  },
  {
    id: "donorName",
    header: "Doador",
    accessorFn: (row) => row.donor?.name ?? "",
    cell: ({ row }) => (
      <div className="truncate text-sm">{row.original.donor?.name ?? "Sem doador"}</div>
    ),
  },
  {
    id: "quantity",
    header: "Quantidade",
    accessorFn: (row) => Number(row.quantity),
    cell: ({ row }) => (
      <div className="font-mono text-sm tabular-nums">
        {Number(row.original.quantity).toLocaleString("pt-BR")}
      </div>
    ),
  },
  {
    id: "remaining",
    header: "Saldo",
    accessorFn: (row) => Number(row.remaining ?? row.quantity),
    cell: ({ row }) => (
      <div className="font-mono text-sm tabular-nums text-foreground">
        {Number(row.original.remaining ?? row.original.quantity).toLocaleString("pt-BR")}
      </div>
    ),
  },
  {
    id: "unit",
    header: "Unid.",
    accessorKey: "unit",
    cell: ({ row }) => <div className="text-sm text-muted-foreground">{row.original.unit}</div>,
  },
  {
    id: "notes",
    header: "Notas",
    accessorKey: "notes",
    cell: ({ row }) => (
      <div className="truncate text-sm text-muted-foreground">{row.original.notes ?? "-"}</div>
    ),
  },
];

const pantryItemExitRelationColumns: ColumnDef<ApiPantryExit>[] = [
  {
    id: "exitDate",
    header: "Data",
    accessorKey: "exitDate",
    cell: ({ row }) => <div className="text-sm">{formatOptionalDate(row.original.exitDate)}</div>,
  },
  {
    id: "sector",
    header: "Setor",
    accessorKey: "sector",
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">
        {row.original.sector || PANTRY_DEFAULT_SECTOR}
      </div>
    ),
  },
  {
    id: "type",
    header: "Tipo",
    accessorKey: "type",
    cell: ({ row }) => <div className="text-sm">{resolveExitTypeLabel(row.original.type)}</div>,
  },
  {
    id: "eventName",
    header: "Evento",
    accessorKey: "eventName",
    cell: ({ row }) => <div className="truncate text-sm">{row.original.eventName ?? "-"}</div>,
  },
  {
    id: "allocations",
    header: "Lotes",
    accessorFn: (row) => row.allocations?.length ?? 0,
    cell: ({ row }) => {
      const count = row.original.allocations?.length ?? 0;
      return (
        <div className="text-sm text-muted-foreground">
          {count ? `${count} lote${count > 1 ? "s" : ""}` : "Automático"}
        </div>
      );
    },
  },
  {
    id: "quantity",
    header: "Quantidade",
    accessorFn: (row) => Number(row.quantity),
    cell: ({ row }) => (
      <div className="font-mono text-sm tabular-nums">
        {Number(row.original.quantity).toLocaleString("pt-BR")}
      </div>
    ),
  },
  {
    id: "unit",
    header: "Unid.",
    accessorKey: "unit",
    cell: ({ row }) => <div className="text-sm text-muted-foreground">{row.original.unit}</div>,
  },
  {
    id: "notes",
    header: "Notas",
    accessorKey: "notes",
    cell: ({ row }) => (
      <div className="truncate text-sm text-muted-foreground">{row.original.notes ?? "-"}</div>
    ),
  },
];

const pantryItemHistoryRelationColumns: ColumnDef<ApiPantryHistoryMovement>[] = [
  {
    id: "kind",
    header: "Movimento",
    accessorKey: "kind",
    cell: ({ row }) => (
      <Badge
        className={
          row.original.kind === "ENTRY"
            ? "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-200"
            : "border-transparent bg-rose-500/15 text-rose-700 dark:text-rose-200"
        }
      >
        {resolveMovementKindLabel(row.original.kind)}
      </Badge>
    ),
  },
  {
    id: "movementDate",
    header: "Data",
    accessorKey: "movementDate",
    cell: ({ row }) => <div className="text-sm">{formatOptionalDate(row.original.movementDate)}</div>,
  },
  {
    id: "sector",
    header: "Setor",
    accessorKey: "sector",
    cell: ({ row }) => (
      <div className="text-sm text-muted-foreground">
        {row.original.sector || PANTRY_DEFAULT_SECTOR}
      </div>
    ),
  },
  {
    id: "quantity",
    header: "Quantidade",
    accessorFn: (row) => Number(row.quantity),
    cell: ({ row }) => (
      <div className="font-mono text-sm tabular-nums">
        {Number(row.original.quantity).toLocaleString("pt-BR")}{" "}
        <span className="text-muted-foreground">{row.original.unit}</span>
      </div>
    ),
  },
  {
    id: "expiryDate",
    header: "Validade",
    accessorKey: "expiryDate",
    cell: ({ row }) => <div className="text-sm">{formatOptionalDate(row.original.expiryDate)}</div>,
  },
  {
    id: "donorName",
    header: "Doador",
    accessorKey: "donorName",
    cell: ({ row }) => (
      <div className="truncate text-sm">
        {row.original.kind === "ENTRY" ? (row.original.donorName ?? "-") : "-"}
      </div>
    ),
  },
  {
    id: "type",
    header: "Tipo de saída",
    accessorKey: "type",
    cell: ({ row }) => (
      <div className="truncate text-sm">
        {row.original.kind === "EXIT" && row.original.type
          ? resolveExitTypeLabel(row.original.type)
          : "—"}
      </div>
    ),
  },
  {
    id: "eventName",
    header: "Evento",
    accessorKey: "eventName",
    cell: ({ row }) => (
      <div className="truncate text-sm">
        {row.original.kind === "EXIT" ? (row.original.eventName ?? "-") : "-"}
      </div>
    ),
  },
  {
    id: "actor",
    header: "Usuário",
    accessorKey: "actor",
    cell: ({ row }) => <div className="truncate text-sm">{row.original.actor}</div>,
  },
  {
    id: "notes",
    header: "Notas",
    accessorKey: "notes",
    cell: ({ row }) => (
      <div className="truncate text-sm text-muted-foreground">{row.original.notes ?? "-"}</div>
    ),
  },
];

const pantryDonorDonationColumns: ColumnDef<ApiPantryEntry>[] = [
  {
    id: "item",
    header: "Alimento",
    accessorFn: (row) => row.item?.name ?? "",
    cell: ({ row }) => (
      <div className="min-w-0 truncate font-medium text-foreground">
        {row.original.item?.name ?? "Alimento"}
      </div>
    ),
  },
  {
    id: "sector",
    header: "Setor",
    accessorKey: "sector",
    cell: ({ row }) => <div className="truncate text-sm text-muted-foreground">{row.original.sector}</div>,
  },
  {
    id: "quantity",
    header: "Quantidade",
    accessorKey: "quantity",
    cell: ({ row }) => (
      <div className="font-mono tabular-nums text-foreground">
        {Number(row.original.quantity).toLocaleString("pt-BR")}
      </div>
    ),
  },
  {
    id: "unit",
    header: "Un.",
    accessorKey: "unit",
    cell: ({ row }) => <div className="text-sm text-muted-foreground">{row.original.unit}</div>,
  },
  {
    id: "entryDate",
    header: "Data",
    accessorKey: "entryDate",
    cell: ({ row }) => formatOptionalDate(row.original.entryDate),
  },
  {
    id: "expiryDate",
    header: "Validade",
    accessorKey: "expiryDate",
    cell: ({ row }) => formatOptionalDate(row.original.expiryDate),
  },
  {
    id: "notes",
    header: "Notas",
    accessorKey: "notes",
    cell: ({ row }) => (
      <div className="max-w-[340px] truncate text-xs text-muted-foreground">
        {row.original.notes ?? "-"}
      </div>
    ),
  },
];

const pantryAllocatedExitColumns: ColumnDef<PantryAllocatedExitRow>[] = [
  {
    id: "exitDate",
    header: "Data",
    accessorKey: "exitDate",
    cell: ({ row }) => <div className="text-sm">{formatOptionalDate(row.original.exitDate)}</div>,
  },
  {
    id: "type",
    header: "Tipo",
    accessorKey: "type",
    cell: ({ row }) => <div className="text-sm">{resolveExitTypeLabel(row.original.type)}</div>,
  },
  {
    id: "sector",
    header: "Setor",
    accessorKey: "sector",
    cell: ({ row }) => <div className="text-sm text-muted-foreground">{row.original.sector}</div>,
  },
  {
    id: "quantity",
    header: "Quantidade",
    accessorFn: (row) => Number(row.quantity),
    cell: ({ row }) => (
      <div className="font-mono text-sm tabular-nums">
        {Number(row.original.quantity).toLocaleString("pt-BR")}{" "}
        <span className="text-muted-foreground">{row.original.unit}</span>
      </div>
    ),
  },
  {
    id: "eventName",
    header: "Evento",
    accessorKey: "eventName",
    cell: ({ row }) => <div className="truncate text-sm">{row.original.eventName ?? "-"}</div>,
  },
  {
    id: "notes",
    header: "Notas",
    accessorKey: "notes",
    cell: ({ row }) => <div className="truncate text-sm text-muted-foreground">{row.original.notes ?? "-"}</div>,
  },
];

const pantryExitAllocationColumns: ColumnDef<PantryExitAllocationRow>[] = [
  {
    id: "entryDate",
    header: "Entrada",
    accessorKey: "entryDate",
    cell: ({ row }) => <div className="text-sm">{formatOptionalDate(row.original.entryDate)}</div>,
  },
  {
    id: "expiryDate",
    header: "Validade",
    accessorKey: "expiryDate",
    cell: ({ row }) => <div className="text-sm">{formatOptionalDate(row.original.expiryDate)}</div>,
  },
  {
    id: "sector",
    header: "Setor",
    accessorKey: "sector",
    cell: ({ row }) => <div className="text-sm text-muted-foreground">{row.original.sector}</div>,
  },
  {
    id: "quantity",
    header: "Quantidade",
    accessorFn: (row) => Number(row.quantity),
    cell: ({ row }) => (
      <div className="font-mono text-sm tabular-nums">
        {Number(row.original.quantity).toLocaleString("pt-BR")}
      </div>
    ),
  },
];

export const pantryItemDetailLayout: DetailLayoutConfig<PantryItemDetailLayoutContext> = {
  editing: AUTO_SAVE_EDITING,
  header: {
    slot: ({ item }) =>
      item ? (
        <div className={PANTRY_DETAIL_BAND_CLASS}>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="text-muted-foreground">Saldo</div>
              <div className="font-mono font-medium tabular-nums text-foreground">
                {Number(item.stock ?? 0).toLocaleString("pt-BR")}
              </div>
              {item.isBelowMin ? (
                <Badge variant="destructive" className="h-5 px-2 text-[10px]">
                  Abaixo do mínimo
                </Badge>
              ) : (
                <Badge variant="secondary" className="h-5 px-2 text-[10px]">
                  OK
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="text-muted-foreground">Prox. validade</div>
              <div className="font-medium text-foreground">
                {item.nextExpiryDate
                  ? formatDateOnlyPtBR(item.nextExpiryDate)
                  : "—"}
              </div>
              {item.daysToExpire !== null ? (
                <div className="font-mono tabular-nums text-muted-foreground">
                  {item.daysToExpire}d
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <div className="text-muted-foreground">Ultimo movimento</div>
              <div className="font-medium text-foreground">
                {item.lastMovementDate
                  ? formatDateOnlyPtBR(item.lastMovementDate)
                  : "—"}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={`${PANTRY_DETAIL_BAND_CLASS} text-xs text-muted-foreground`}>
          Salve para visualizar as metricas do alimento.
        </div>
      ),
  },
  main: ({
    mode,
    readOnly,
    draft,
    setDraft,
    onCommitField,
    onUnitChange,
    onGroupChange,
    sectorsLoading,
    sectorOptions,
    onDefaultSectorChange,
    onOpenNewSector,
  }) => (
    <PantryItemDetailForm
      mode={mode}
      readOnly={readOnly}
      draft={draft}
      setDraft={setDraft}
      onCommitField={onCommitField}
      onUnitChange={onUnitChange}
      onGroupChange={onGroupChange}
      sectorsLoading={sectorsLoading}
      sectorOptions={sectorOptions}
      onDefaultSectorChange={onDefaultSectorChange}
      onOpenNewSector={onOpenNewSector}
      inputLineClassName={PANTRY_DETAIL_INPUT_CLASS}
    />
  ),
  tabTemplates: [
    {
      key: "entries",
      label: "Entradas",
      badge: ({ entryRows }) => entryRows.length,
      relations: [
        {
          key: "item.entries",
          label: "Entradas",
          rows: ({ mode, entryRows }) => (mode === "edit" ? entryRows : []),
          loading: ({ movementLoading }) => movementLoading,
          columns: pantryItemEntryRelationColumns,
          searchable: true,
          searchPlaceholder: "Pesquisar entradas por doador, setor, notas ou lote",
          getRowId: (row) => row.id,
          onRowClick: (row, context) => context.onOpenEntry(row.id),
          emptyLabel: ({ mode }) =>
            mode !== "edit"
              ? "Salve o alimento para registrar entradas."
              : "Sem entradas.",
          action: {
            label: "Nova entrada",
            icon: <Plus className="mr-1 size-4" />,
            onClick: (context) => context.onNewEntry(),
            disabled: (context) => context.readOnly || context.mode !== "edit",
            hidden: (context) => context.mode !== "edit",
          },
        },
      ],
    },
    {
      key: "exits",
      label: "Saídas",
      badge: ({ exitRows }) => exitRows.length,
      relations: [
        {
          key: "item.exits",
          label: "Saídas",
          rows: ({ mode, exitRows }) => (mode === "edit" ? exitRows : []),
          loading: ({ movementLoading }) => movementLoading,
          columns: pantryItemExitRelationColumns,
          searchable: true,
          searchPlaceholder: "Pesquisar saídas por tipo, setor, evento ou notas",
          getRowId: (row) => row.id,
          onRowClick: (row, context) => context.onOpenExit(row.id),
          emptyLabel: ({ mode }) =>
            mode !== "edit" ? "Salve o alimento para registrar saídas." : "Sem saídas.",
          action: {
            label: "Nova saída",
            icon: <Plus className="mr-1 size-4" />,
            onClick: (context) => context.onNewExit(),
            disabled: (context) => context.readOnly || context.mode !== "edit",
            hidden: (context) => context.mode !== "edit",
          },
        },
      ],
    },
    {
      key: "history",
      label: "Histórico",
      badge: ({ historyRows }) => historyRows.length,
      relations: [
        {
          key: "item.history",
          label: "Histórico",
          rows: ({ mode, historyRows }) => (mode === "edit" ? historyRows : []),
          loading: ({ movementLoading }) => movementLoading,
          columns: pantryItemHistoryRelationColumns,
          searchable: true,
          searchPlaceholder: "Pesquisar histórico por movimento, usuário, setor ou notas",
          getRowId: (row) => row.id,
          onRowClick: (row, context) =>
            row.kind === "ENTRY"
              ? context.onOpenEntry(row.id)
              : context.onOpenExit(row.id),
          emptyLabel: ({ mode }) =>
            mode !== "edit" ? "Salve o alimento para ver o histórico." : "Sem histórico.",
        },
      ],
    },
  ],
  side: ({
    mode,
    readOnly,
    detailAudit,
    auditVisibleCount,
    onAuditVisibleCountChange,
    mentionableUsers,
    commentDraft,
    onCommentDraftChange,
    onSubmitComment,
    onDeleteComment,
    commentSubmitting,
    tags,
    onTagsChange,
    onTagsCommit,
    internalNotes,
    onInternalNotesChange,
    onInternalNotesBlur,
    onUploadAttachment,
    onDeleteAttachment,
    item,
    historyItems,
  }) => {
    return (
      <StandardDetailMetadataSide
        mode={mode}
        readOnly={readOnly}
        detailAudit={detailAudit}
        auditVisibleCount={auditVisibleCount}
        onAuditVisibleCountChange={onAuditVisibleCountChange}
        canAudit
        comments={{
          items: item?.comments ?? [],
          draft: commentDraft,
          users: mentionableUsers,
          onDraftChange: onCommentDraftChange,
          onSubmit: onSubmitComment,
          onDelete: mode === "edit" ? onDeleteComment : undefined,
          submitting: commentSubmitting,
          readOnly: readOnly || mode !== "edit",
          emptyLabel:
            mode === "create"
              ? "Salve o alimento para habilitar comentários."
              : "Nenhum comentário registrado para este alimento.",
        }}
        notes={{
          value: internalNotes,
          onChange: onInternalNotesChange,
          onBlur: onInternalNotesBlur,
          readOnly,
        }}
        tags={{
          value: tags,
          onChange: onTagsChange,
          onCommit: onTagsCommit,
          readOnly,
        }}
        attachments={{
          items:
            item?.attachments?.map((attachment) => ({
              id: attachment.id,
              label: attachment.label,
              href: resolveMediaUrl(attachment.filePath),
              mimeType: attachment.mimeType ?? null,
              sizeLabel: attachment.sizeLabel ?? null,
              createdAt: attachment.createdAt,
            })) ?? [],
          onUpload: onUploadAttachment,
          onDelete: mode === "edit" ? onDeleteAttachment : undefined,
          readOnly: readOnly || mode !== "edit",
          emptyLabel:
            mode === "create"
              ? "Salve o alimento para habilitar anexos."
              : "Nenhum anexo registrado para este alimento.",
        }}
        history={{
          items: historyItems,
          emptyLabel:
            mode === "create"
              ? "Salve o alimento para habilitar histórico."
              : "Nenhum histórico registrado para este alimento.",
        }}
        contextItems={[
          { key: "stock", label: "Saldo total", value: Number(item?.stock ?? 0).toLocaleString("pt-BR") },
          { key: "group", label: "Grupo", value: item?.group ?? "Sem grupo" },
          { key: "sector", label: "Setor padrão", value: item?.defaultSector ?? PANTRY_DEFAULT_SECTOR },
          { key: "status", label: "Status", value: item?.validityStatus ?? "Sem status" },
        ]}
      />
    );
  },
  auditSources: {
    primaryEntity: {
      key: "item",
      entity: "PantryItem",
      model: "pantry.items",
      label: "Item",
      fieldLabels: PANTRY_AUDIT_FIELD_LABELS,
      valueFormatters: {
        defaultSector: (value) =>
          normalizeSector(typeof value === "string" ? value : null),
        minStock: (value) => formatAuditNumber(value),
      },
      joinKey: "itemId",
      idField: "id",
      resolveEntityId: ({ item }) => item?.id,
    },
    relatedEntities: [
      {
        key: "entries",
        entity: "PantryEntry",
        model: "pantry.entries",
        label: "Entrada",
        fieldLabels: PANTRY_ENTRY_AUDIT_FIELD_LABELS,
        valueFormatters: {
          donorId: (value, { context }) =>
            resolveDonorAuditValue(context.donorNameById, value),
          sector: (value) =>
            normalizeSector(typeof value === "string" ? value : null),
          quantity: (value) => formatAuditNumber(value),
          entryDate: (value) => formatAuditDate(value),
          expiryDate: (value) =>
            typeof value === "string" && value.trim()
              ? formatAuditDate(value)
              : "Sem validade",
          reversalOfExitId: (value, { context }) =>
            formatAuditReferenceLabel(
              context.exitLabelById[typeof value === "string" ? value.trim() : ""],
              value,
              "Saída",
            ),
        },
        joinKey: "itemId",
        idField: "id",
        resolveEntityIds: ({ entryRows }) => entryRows.map((entry) => entry.id),
      },
      {
        key: "exits",
        entity: "PantryExit",
        model: "pantry.exits",
        label: "Saída",
        fieldLabels: PANTRY_EXIT_AUDIT_FIELD_LABELS,
        valueFormatters: {
          sector: (value) =>
            normalizeSector(typeof value === "string" ? value : null),
          quantity: (value) => formatAuditNumber(value),
          exitDate: (value) => formatAuditDate(value),
          type: (value) =>
            resolveExitTypeLabel(typeof value === "string" ? value : null),
          eventName: (value) =>
            typeof value === "string" && value.trim()
              ? value.trim()
              : "Sem evento",
          reversalOfEntryId: (value, { context }) =>
            formatAuditReferenceLabel(
              context.entryLabelById[typeof value === "string" ? value.trim() : ""],
              value,
              "Entrada",
            ),
        },
        joinKey: "itemId",
        idField: "id",
        resolveEntityIds: ({ exitRows }) => exitRows.map((exit) => exit.id),
      },
    ],
    sort: [{ field: "createdAt", direction: "desc" }],
    pagination: { limit: 120 },
  },
};

export const pantryDonorDetailLayout: DetailLayoutConfig<PantryDonorDetailLayoutContext> = {
  editing: AUTO_SAVE_EDITING,
  header: {
    leadingSlot: ({
      draft,
      readOnly,
      avatarUploading,
      onAvatarFileSelect,
    }) => (
      <DetailIdentityMediaField
        variant="header"
        name={draft.name || "Doador"}
        value={draft.avatarUrl}
        readOnly={readOnly}
        busy={avatarUploading}
        onFileSelect={onAvatarFileSelect}
      />
    ),
    slot: ({ donor, draft }) => {
      const donorLabel = draft.name.trim() || donor?.name || "Novo doador";

      return (
        <div className={PANTRY_DETAIL_BAND_CLASS}>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="text-muted-foreground">Tipo</div>
              <div className="font-medium text-foreground">
                {PANTRY_DONOR_TYPE_LABELS[draft.type]}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-muted-foreground">Contato</div>
              <div className="font-medium text-foreground">
                {draft.contact ?? donor?.contact ?? "Sem contato cadastrado."}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-muted-foreground">Nome</div>
              <div className="font-medium text-foreground">{donorLabel}</div>
            </div>
          </div>
        </div>
      );
    },
  },
  main: ({
    readOnly,
    draft,
    setDraft,
    onCommitField,
    onTypeChange,
  }) => (
    <div className={PANTRY_DETAIL_SECTION_CLASS}>
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="space-y-1">
              <div className="text-[11px] font-medium text-muted-foreground">
                Nome
              </div>
              <Input
                value={draft.name}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, name: event.target.value }))
                }
                onBlur={() => onCommitField("name")}
                placeholder="Ex: Mercado Central"
                className={PANTRY_DETAIL_INPUT_CLASS}
                readOnly={readOnly}
              />
            </div>

            <div className="space-y-1">
              <div className="text-[11px] font-medium text-muted-foreground">
                Tipo
              </div>
              <Select
                value={draft.type}
                onValueChange={(value) => {
                  const next = value as ApiPantryDonor["type"];
                  setDraft((prev) => ({ ...prev, type: next }));
                  onTypeChange(next);
                }}
                disabled={readOnly}
              >
                <SelectTrigger className={PANTRY_DETAIL_INPUT_CLASS}>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERSON">
                    {PANTRY_DONOR_TYPE_LABELS.PERSON}
                  </SelectItem>
                  <SelectItem value="COMPANY">
                    {PANTRY_DONOR_TYPE_LABELS.COMPANY}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-medium text-muted-foreground">
              Contato
            </div>
            <Input
              value={draft.contact ?? ""}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  contact: event.target.value || null,
                }))
              }
              onBlur={() => onCommitField("contact")}
              placeholder="Telefone, e-mail..."
              className={PANTRY_DETAIL_INPUT_CLASS}
              readOnly={readOnly}
            />
          </div>
        </div>
      </div>
    </div>
  ),
  bottomRelations: [
    {
      key: "donor.donations",
      label: "Doações",
      rows: ({ mode, entries }) => (mode === "edit" ? entries : []),
      loading: ({ entriesLoading }) => entriesLoading,
      columns: pantryDonorDonationColumns,
      getRowId: (row) => row.id,
      onRowClick: (row, context) => context.onOpenEntry(row.id),
      emptyLabel: ({ mode }) =>
        mode !== "edit" ? "Salve o doador para ver as doações." : "Sem doações.",
    },
  ],
  side: ({
    mode,
    readOnly,
    detailAudit,
    auditVisibleCount,
    onAuditVisibleCountChange,
    mentionableUsers,
    commentDraft,
    onCommentDraftChange,
    onSubmitComment,
    onDeleteComment,
    commentSubmitting,
    tags,
    onTagsChange,
    onTagsCommit,
    internalNotes,
    onInternalNotesChange,
    onInternalNotesBlur,
    onUploadAttachment,
    onDeleteAttachment,
    donor,
    historyItems,
  }) => (
    <StandardDetailMetadataSide
      mode={mode}
      readOnly={readOnly}
      detailAudit={detailAudit}
      auditVisibleCount={auditVisibleCount}
      onAuditVisibleCountChange={onAuditVisibleCountChange}
      canAudit
      comments={{
        items: donor?.comments ?? [],
        draft: commentDraft,
        users: mentionableUsers,
        onDraftChange: onCommentDraftChange,
        onSubmit: onSubmitComment,
        onDelete: mode === "edit" ? onDeleteComment : undefined,
        submitting: commentSubmitting,
        readOnly: readOnly || mode !== "edit",
        emptyLabel: mode === "create" ? "Salve o doador para habilitar comentários." : "Nenhum comentário registrado para este doador.",
      }}
      notes={{ value: internalNotes, onChange: onInternalNotesChange, onBlur: onInternalNotesBlur, readOnly }}
      tags={{ value: tags, onChange: onTagsChange, onCommit: onTagsCommit, readOnly }}
      attachments={{
        items:
          donor?.attachments?.map((attachment) => ({
            id: attachment.id,
            label: attachment.label,
            href: resolveMediaUrl(attachment.filePath),
            mimeType: attachment.mimeType ?? null,
            sizeLabel: attachment.sizeLabel ?? null,
            createdAt: attachment.createdAt,
          })) ?? [],
        onUpload: onUploadAttachment,
        onDelete: mode === "edit" ? onDeleteAttachment : undefined,
        readOnly: readOnly || mode !== "edit",
        emptyLabel: mode === "create" ? "Salve o doador para habilitar anexos." : "Nenhum anexo registrado para este doador.",
      }}
      history={{ items: historyItems }}
      contextItems={[
        { key: "type", label: "Tipo", value: donor ? resolveDonorTypeAuditValue(donor.type) : "Sem tipo" },
        { key: "contact", label: "Contato", value: donor?.contact ?? "Sem contato" },
      ]}
    />
  ),
  auditSources: {
    primaryEntity: {
      key: "donor",
      entity: "PantryDonor",
      model: "pantry.donors",
      label: "Doador",
      fieldLabels: PANTRY_DONOR_AUDIT_FIELD_LABELS,
      valueFormatters: {
        type: (value) => resolveDonorTypeAuditValue(value),
        avatarUrl: (value) => resolveAvatarAuditValue(value),
      },
      joinKey: "donorId",
      idField: "id",
      resolveEntityId: ({ donor }) => donor?.id,
    },
    relatedEntities: [
      {
        key: "donations",
        entity: "PantryEntry",
        model: "pantry.entries",
        label: "Doa??o",
        fieldLabels: PANTRY_ENTRY_AUDIT_FIELD_LABELS,
        valueFormatters: {
          donorId: (value, { context }) =>
            resolveDonorAuditValue(context.donorNameById, value),
          sector: (value) =>
            normalizeSector(typeof value === "string" ? value : null),
          quantity: (value) => formatAuditNumber(value),
          entryDate: (value) => formatAuditDate(value),
          expiryDate: (value) =>
            typeof value === "string" && value.trim()
              ? formatAuditDate(value)
              : "Sem validade",
          reversalOfExitId: (value) =>
            formatAuditReferenceLabel(undefined, value, "Saída"),
        },
        joinKey: "donorId",
        idField: "id",
        resolveEntityIds: ({ entries }) => entries.map((entry) => entry.id),
      },
    ],
    sort: [{ field: "createdAt", direction: "desc" }],
    pagination: { limit: 120 },
  },
};

export const pantryEntryDetailLayout: DetailLayoutConfig<PantryEntryDetailLayoutContext> = {
  editing: AUTO_SAVE_EDITING,
  header: {
    slot: ({ entry }) =>
      entry ? (
        <div className={PANTRY_DETAIL_BAND_CLASS}>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="text-muted-foreground">Quantidade</div>
              <div className="font-mono font-medium text-foreground tabular-nums">
                {Number(entry.quantity).toLocaleString("pt-BR")} {entry.unit}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-muted-foreground">Restante</div>
              <div className="font-mono font-medium text-foreground tabular-nums">
                {Number(entry.remaining ?? entry.quantity).toLocaleString("pt-BR")} {entry.unit}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-muted-foreground">Setor</div>
              <div className="font-medium text-foreground">
                {entry.sector || PANTRY_DEFAULT_SECTOR}
              </div>
            </div>
          </div>
        </div>
      ) : null,
  },
  main: ({
    draft,
    setDraft,
    readOnly,
    saving,
    donors,
    donorsLoading,
    sectorsLoading,
    sectorOptions,
    onCommitField,
    onPatch,
    onOpenNewSector,
    onOpenCreateDonor,
  }) => (
    <div className={PANTRY_DETAIL_SECTION_CLASS}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[120px_1fr_1fr] md:items-end">
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Quantidade
          </div>
          <Input
            value={String(draft.quantity)}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, quantity: Number(event.target.value) }))
            }
            onBlur={() => onCommitField("quantity")}
            className={PANTRY_DETAIL_INPUT_CLASS}
            inputMode="numeric"
            placeholder="Qtd."
            readOnly={saving || readOnly}
          />
        </div>

        <div>
          <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Unidade
          </div>
          <Select
            value={draft.unit}
            onValueChange={(value) => {
              setDraft((prev) => ({ ...prev, unit: value }));
              onPatch({ unit: value });
            }}
            disabled={saving || readOnly}
          >
            <SelectTrigger className={PANTRY_DETAIL_INPUT_CLASS}>
              <SelectValue placeholder="Unidade" />
            </SelectTrigger>
            <SelectContent>
              {PANTRY_ITEM_UNIT.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Setor
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={draft.sector}
              onValueChange={(value) => {
                setDraft((prev) => ({ ...prev, sector: value }));
                onPatch({ sector: value });
              }}
              disabled={saving || readOnly}
            >
              <SelectTrigger className={PANTRY_DETAIL_INPUT_CLASS}>
                <SelectValue placeholder={sectorsLoading ? "Carregando..." : "Setor"} />
              </SelectTrigger>
              <SelectContent>
                {sectorOptions.map((sector) => (
                  <SelectItem key={sector} value={sector}>
                    {sector}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              title="Novo setor"
              aria-label="Novo setor"
              onClick={onOpenNewSector}
              disabled={saving || readOnly}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr] md:items-end">
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Doador
          </div>
          <Select
            value={draft.donorId ?? PANTRY_ENTRY_DONOR_NONE_VALUE}
            onValueChange={(value) => {
              const next = value === PANTRY_ENTRY_DONOR_NONE_VALUE ? null : value;
              setDraft((prev) => ({ ...prev, donorId: next }));
              onPatch({ donorId: next });
            }}
            disabled={saving || readOnly}
          >
            <SelectTrigger className={PANTRY_DETAIL_INPUT_CLASS}>
              <SelectValue placeholder={donorsLoading ? "Carregando..." : "Doador"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PANTRY_ENTRY_DONOR_NONE_VALUE}>Sem doador</SelectItem>
              {donors.map((donor) => (
                <SelectItem key={donor.id} value={donor.id}>
                  {donor.name}
                </SelectItem>
              ))}
              <div className="px-2 py-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-8 w-full"
                  onClick={onOpenCreateDonor}
                  disabled={saving || readOnly}
                >
                  <Plus className="mr-1 size-4" />
                  Novo doador
                </Button>
              </div>
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Data da entrada
          </div>
          <Input
            type="date"
            value={draft.entryDate}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, entryDate: event.target.value }))
            }
            onBlur={() => onCommitField("entryDate")}
            className={PANTRY_DETAIL_INPUT_CLASS}
            readOnly={saving || readOnly}
            title="Data da entrada"
          />
        </div>

        <div>
          <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Validade
          </div>
          <Input
            type="date"
            value={draft.expiryDate}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, expiryDate: event.target.value }))
            }
            onBlur={() => onCommitField("expiryDate")}
            className={PANTRY_DETAIL_INPUT_CLASS}
            readOnly={saving || readOnly}
            title="Validade"
          />
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Notas
        </div>
        <Input
          value={draft.notes}
          onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
          onBlur={() => onCommitField("notes")}
          className={PANTRY_DETAIL_INPUT_CLASS}
          placeholder="Notas (opcional)"
          readOnly={saving || readOnly}
        />
      </div>
    </div>
  ),
  bottomRelations: [
    {
      key: "entry.allocatedExits",
      label: "Saídas vinculadas",
      rows: ({ mode, allocatedExits }) => (mode === "edit" ? allocatedExits : []),
      loading: ({ allocatedExitsLoading }) => allocatedExitsLoading,
      columns: pantryAllocatedExitColumns,
      getRowId: (row) => row.exitId,
      onRowClick: (row, context) => context.onOpenExit(row.exitId),
      action: {
        label: "Nova saída",
        icon: <Plus className="mr-1 size-4" />,
        onClick: (context) => context.onOpenCreateExit(),
        disabled: (context) =>
          context.readOnly || !context.canCreateRelatedExit || context.mode !== "edit",
        hidden: (context) => context.mode !== "edit",
      },
      emptyLabel: ({ mode }) =>
        mode !== "edit"
          ? "Salve a entrada para ver saídas relacionadas."
          : "Sem saídas vinculadas.",
    },
  ],
  side: ({
    mode,
    readOnly,
    detailAudit,
    auditVisibleCount,
    onAuditVisibleCountChange,
    mentionableUsers,
    commentDraft,
    onCommentDraftChange,
    onSubmitComment,
    onDeleteComment,
    commentSubmitting,
    tags,
    onTagsChange,
    onTagsCommit,
    internalNotes,
    onInternalNotesChange,
    onInternalNotesBlur,
    onUploadAttachment,
    onDeleteAttachment,
    entry,
    historyItems,
  }) => (
    <StandardDetailMetadataSide
      mode={mode}
      readOnly={readOnly}
      detailAudit={detailAudit}
      auditVisibleCount={auditVisibleCount}
      onAuditVisibleCountChange={onAuditVisibleCountChange}
      canAudit
      comments={{
        items: entry?.comments ?? [],
        draft: commentDraft,
        users: mentionableUsers,
        onDraftChange: onCommentDraftChange,
        onSubmit: onSubmitComment,
        onDelete: mode === "edit" ? onDeleteComment : undefined,
        submitting: commentSubmitting,
        readOnly: readOnly || mode !== "edit",
        emptyLabel: mode === "create" ? "Salve a entrada para habilitar comentários." : "Nenhum comentário registrado para esta entrada.",
      }}
      notes={{ value: internalNotes, onChange: onInternalNotesChange, onBlur: onInternalNotesBlur, readOnly }}
      tags={{ value: tags, onChange: onTagsChange, onCommit: onTagsCommit, readOnly }}
      attachments={{
        items:
          entry?.attachments?.map((attachment) => ({
            id: attachment.id,
            label: attachment.label,
            href: resolveMediaUrl(attachment.filePath),
            mimeType: attachment.mimeType ?? null,
            sizeLabel: attachment.sizeLabel ?? null,
            createdAt: attachment.createdAt,
          })) ?? [],
        onUpload: onUploadAttachment,
        onDelete: mode === "edit" ? onDeleteAttachment : undefined,
        readOnly: readOnly || mode !== "edit",
        emptyLabel: mode === "create" ? "Salve a entrada para habilitar anexos." : "Nenhum anexo registrado para esta entrada.",
      }}
      history={{ items: historyItems }}
      contextItems={[
        { key: "item", label: "Alimento", value: entry?.item?.name ?? "Sem alimento" },
        { key: "sector", label: "Setor", value: entry?.sector ?? PANTRY_DEFAULT_SECTOR },
        { key: "status", label: "Status", value: entry?.isClosed ? "Fechada" : "Aberta" },
      ]}
    />
  ),
  auditSources: {
    primaryEntity: {
      key: "entry",
      entity: "PantryEntry",
      model: "pantry.entries",
      label: "Entrada",
      fieldLabels: PANTRY_ENTRY_AUDIT_FIELD_LABELS,
      valueFormatters: {
        donorId: (value, { context }) =>
          resolveDonorAuditValue(context.donorNameById, value),
        sector: (value) =>
          normalizeSector(typeof value === "string" ? value : null),
        quantity: (value) => formatAuditNumber(value),
        entryDate: (value) => formatAuditDate(value),
        expiryDate: (value) =>
          typeof value === "string" && value.trim()
            ? formatAuditDate(value)
            : "Sem validade",
        reversalOfExitId: (value, { context }) =>
          formatAuditReferenceLabel(
            context.exitLabelById[typeof value === "string" ? value.trim() : ""],
            value,
            "Saída",
          ),
      },
      joinKey: "entryId",
      idField: "id",
      resolveEntityId: ({ entry }) => entry?.id,
    },
    relatedEntities: [
      {
        key: "entry.exits",
        entity: "PantryExit",
        model: "pantry.exits",
        label: "Saída",
        fieldLabels: PANTRY_EXIT_AUDIT_FIELD_LABELS,
        valueFormatters: {
          sector: (value) =>
            normalizeSector(typeof value === "string" ? value : null),
          quantity: (value) => formatAuditNumber(value),
          exitDate: (value) => formatAuditDate(value),
          type: (value) =>
            resolveExitTypeLabel(typeof value === "string" ? value : null),
          eventName: (value) =>
            typeof value === "string" && value.trim() ? value.trim() : "Sem evento",
          reversalOfEntryId: (value) =>
            formatAuditReferenceLabel(undefined, value, "Entrada"),
        },
        joinKey: "entryId",
        idField: "id",
        resolveEntityIds: ({ allocatedExits }) =>
          allocatedExits.map((exitRow) => exitRow.exitId),
      },
    ],
    sort: [{ field: "createdAt", direction: "desc" }],
    pagination: { limit: 120 },
  },
};

export const pantryExitDetailLayout: DetailLayoutConfig<PantryExitDetailLayoutContext> = {
  editing: AUTO_SAVE_EDITING,
  header: {
    slot: ({ exit }) =>
      exit ? (
        <div className={PANTRY_DETAIL_BAND_CLASS}>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="text-muted-foreground">Quantidade</div>
              <div className="font-mono font-medium text-foreground tabular-nums">
                {Number(exit.quantity).toLocaleString("pt-BR")} {exit.unit}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-muted-foreground">Tipo</div>
              <div className="font-medium text-foreground">
                {resolveExitTypeLabel(exit.type)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-muted-foreground">Setor</div>
              <div className="font-medium text-foreground">
                {exit.sector || PANTRY_DEFAULT_SECTOR}
              </div>
            </div>
          </div>
        </div>
      ) : null,
  },
  main: ({
    draft,
    setDraft,
    readOnly,
    saving,
    entriesLoading,
    entries,
    entryLocked,
    selectedEntry,
    sectorsLoading,
    sectorOptions,
    onCommitField,
    onPatch,
    onOpenNewSector,
  }) => (    <div className={PANTRY_DETAIL_SECTION_CLASS}>
      <div className="mt-3">
        <div className="max-w-4xl">
          <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Entrada de origem
          </div>
          <Select
            value={draft.entryId || PANTRY_EXIT_ENTRY_AUTO_VALUE}
            onValueChange={(value) => {
              const nextEntryId = value === PANTRY_EXIT_ENTRY_AUTO_VALUE ? "" : value;
              const nextEntry = entries.find((row) => row.id === nextEntryId) ?? null;
              setDraft((prev) => ({
                ...prev,
                entryId: nextEntryId,
                sector: nextEntry?.sector ?? prev.sector ?? PANTRY_DEFAULT_SECTOR,
                unit: nextEntry?.unit ?? prev.unit,
              }));
              onPatch({ entryId: nextEntryId });
            }}
            disabled={saving || readOnly || entryLocked}
          >
            <SelectTrigger className={PANTRY_DETAIL_INPUT_CLASS}>
              <SelectValue placeholder={entriesLoading ? "Carregando..." : "Entrada de origem"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PANTRY_EXIT_ENTRY_AUTO_VALUE}>Automático</SelectItem>
              {entries.map((entry) => {
                const remaining =
                  typeof entry.remaining === "number"
                    ? entry.remaining
                    : entry.quantity - (entry.allocatedTotal ?? 0);
                const expiry = entry.expiryDate ? formatDateOnlyPtBR(entry.expiryDate) : "Sem validade";
                return (
                  <SelectItem key={entry.id} value={entry.id}>
                    {`Entrada ${formatDateOnlyPtBR(entry.entryDate)} - ${expiry} - ${entry.sector || PANTRY_DEFAULT_SECTOR} - ${Number(remaining).toLocaleString("pt-BR")} ${entry.unit}`}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <div className="mt-2 text-[11px] text-muted-foreground">
            {selectedEntry ? (
              <>
                Saindo a partir da entrada{" "}
                <span className="font-medium text-foreground">
                  {selectedEntry.entryDate
                    ? formatDateOnlyPtBR(selectedEntry.entryDate)
                    : "—"}
                </span>
                {" - "}
                <span className="font-medium text-foreground">
                  {selectedEntry.sector || PANTRY_DEFAULT_SECTOR}
                </span>
                {" - saldo "}
                <span className="font-mono font-medium text-foreground">
                  {Number(
                    typeof selectedEntry.remaining === "number"
                      ? selectedEntry.remaining
                      : selectedEntry.quantity - (selectedEntry.allocatedTotal ?? 0),
                  ).toLocaleString("pt-BR")}{" "}
                  {selectedEntry.unit}
                </span>
              </>
            ) : (
              "Automático: usa a entrada com validade mais próxima disponível."
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-[120px_1fr_1fr] md:items-end">
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Quantidade
          </div>
          <Input
            value={String(draft.quantity)}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, quantity: Number(event.target.value) }))
            }
            onBlur={() => onCommitField("quantity")}
            className={PANTRY_DETAIL_INPUT_CLASS}
            inputMode="numeric"
            placeholder="Qtd."
            readOnly={saving || readOnly}
          />
        </div>

        <div>
          <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Unidade
          </div>
          <Select
            value={draft.unit}
            onValueChange={(value) => {
              setDraft((prev) => ({ ...prev, unit: value }));
              onPatch({ unit: value });
            }}
            disabled={saving || readOnly}
          >
            <SelectTrigger className={PANTRY_DETAIL_INPUT_CLASS}>
              <SelectValue placeholder="Unidade" />
            </SelectTrigger>
            <SelectContent>
              {PANTRY_ITEM_UNIT.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Setor
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={draft.sector}
              onValueChange={(value) => {
                setDraft((prev) => ({ ...prev, sector: value }));
                onPatch({ sector: value });
              }}
              disabled={saving || readOnly || Boolean(selectedEntry)}
            >
              <SelectTrigger className={PANTRY_DETAIL_INPUT_CLASS}>
                <SelectValue placeholder={sectorsLoading ? "Carregando..." : "Setor"} />
              </SelectTrigger>
              <SelectContent>
                {sectorOptions.map((sector) => (
                  <SelectItem key={sector} value={sector}>
                    {sector}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 shrink-0"
              title="Novo setor"
              aria-label="Novo setor"
              onClick={onOpenNewSector}
              disabled={saving || readOnly || Boolean(selectedEntry)}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr] md:items-end">
        <div>
          <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Data da saída
          </div>
          <Input
            type="date"
            value={draft.exitDate}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, exitDate: event.target.value }))
            }
            onBlur={() => onCommitField("exitDate")}
            className={PANTRY_DETAIL_INPUT_CLASS}
            readOnly={saving || readOnly}
            title="Data da saída"
          />
        </div>

        <div>
          <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Tipo de saída
          </div>
          <Select
            value={draft.type}
            onValueChange={(value) => {
              const nextType = value as PantryExitDraft["type"];
              setDraft((prev) => ({ ...prev, type: nextType }));
              onPatch({ type: nextType });
            }}
            disabled={saving || readOnly}
          >
            <SelectTrigger className={PANTRY_DETAIL_INPUT_CLASS}>
              <SelectValue placeholder="Tipo de saída" />
            </SelectTrigger>
            <SelectContent>
              {PANTRY_EXIT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {resolveExitTypeLabel(option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {draft.type === "EVENT" ? (
        <div className="mt-4">
          <div className="max-w-xl">
            <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Nome do evento
            </div>
            <Input
              value={draft.eventName}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, eventName: event.target.value }))
              }
              onBlur={() => onCommitField("eventName")}
              className={PANTRY_DETAIL_INPUT_CLASS}
              placeholder="Nome do evento"
              readOnly={saving || readOnly}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-4">
        <div className="mb-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Notas
        </div>
        <Input
          value={draft.notes}
          onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
          onBlur={() => onCommitField("notes")}
          className={PANTRY_DETAIL_INPUT_CLASS}
          placeholder="Notas (opcional)"
          readOnly={saving || readOnly}
        />
      </div>
    </div>  ),
  bottomRelations: [
    {
      key: "exit.allocations",
      label: "Lotes vinculados",
      rows: ({ mode, exit, entryById }) =>
        mode === "edit"
          ? (exit?.allocations ?? []).map((allocation) => ({
              entryId: allocation.entryId,
              quantity: Number(allocation.quantity ?? 0),
              expiryDate: allocation.expiryDate ?? null,
              sector: allocation.sector ?? PANTRY_DEFAULT_SECTOR,
              entryDate: entryById[allocation.entryId]?.entryDate ?? "",
            }))
          : [],
      columns: pantryExitAllocationColumns,
      getRowId: (row) => row.entryId,
      onRowClick: (row, context) => context.onOpenEntry(row.entryId),
      emptyLabel: ({ mode }) =>
        mode !== "edit"
          ? "Salve a saída para ver lotes relacionados."
          : "Sem lotes vinculados.",
    },
  ],
  side: ({
    mode,
    readOnly,
    detailAudit,
    auditVisibleCount,
    onAuditVisibleCountChange,
    mentionableUsers,
    commentDraft,
    onCommentDraftChange,
    onSubmitComment,
    onDeleteComment,
    commentSubmitting,
    tags,
    onTagsChange,
    onTagsCommit,
    internalNotes,
    onInternalNotesChange,
    onInternalNotesBlur,
    onUploadAttachment,
    onDeleteAttachment,
    exit,
    historyItems,
  }) => (
    <StandardDetailMetadataSide
      mode={mode}
      readOnly={readOnly}
      detailAudit={detailAudit}
      auditVisibleCount={auditVisibleCount}
      onAuditVisibleCountChange={onAuditVisibleCountChange}
      canAudit
      comments={{
        items: exit?.comments ?? [],
        draft: commentDraft,
        users: mentionableUsers,
        onDraftChange: onCommentDraftChange,
        onSubmit: onSubmitComment,
        onDelete: mode === "edit" ? onDeleteComment : undefined,
        submitting: commentSubmitting,
        readOnly: readOnly || mode !== "edit",
        emptyLabel: mode === "create" ? "Salve a saída para habilitar comentários." : "Nenhum comentário registrado para esta saída.",
      }}
      notes={{ value: internalNotes, onChange: onInternalNotesChange, onBlur: onInternalNotesBlur, readOnly }}
      tags={{ value: tags, onChange: onTagsChange, onCommit: onTagsCommit, readOnly }}
      attachments={{
        items:
          exit?.attachments?.map((attachment) => ({
            id: attachment.id,
            label: attachment.label,
            href: resolveMediaUrl(attachment.filePath),
            mimeType: attachment.mimeType ?? null,
            sizeLabel: attachment.sizeLabel ?? null,
            createdAt: attachment.createdAt,
          })) ?? [],
        onUpload: onUploadAttachment,
        onDelete: mode === "edit" ? onDeleteAttachment : undefined,
        readOnly: readOnly || mode !== "edit",
        emptyLabel: mode === "create" ? "Salve a saída para habilitar anexos." : "Nenhum anexo registrado para esta saída.",
      }}
      history={{ items: historyItems }}
      contextItems={[
        { key: "item", label: "Alimento", value: exit?.item?.name ?? "Sem alimento" },
        { key: "sector", label: "Setor", value: exit?.sector ?? PANTRY_DEFAULT_SECTOR },
        { key: "type", label: "Tipo", value: exit ? resolveExitTypeLabel(exit.type) : "Sem tipo" },
      ]}
    />
  ),
  auditSources: {
    primaryEntity: {
      key: "exit",
      entity: "PantryExit",
      model: "pantry.exits",
      label: "Saída",
      fieldLabels: PANTRY_EXIT_AUDIT_FIELD_LABELS,
      valueFormatters: {
        sector: (value) =>
          normalizeSector(typeof value === "string" ? value : null),
        quantity: (value) => formatAuditNumber(value),
        exitDate: (value) => formatAuditDate(value),
        type: (value) =>
          resolveExitTypeLabel(typeof value === "string" ? value : null),
        eventName: (value) =>
          typeof value === "string" && value.trim() ? value.trim() : "Sem evento",
        reversalOfEntryId: (value, { context }) =>
          formatAuditReferenceLabel(
            context.entryLabelById[typeof value === "string" ? value.trim() : ""],
            value,
            "Entrada",
          ),
      },
      joinKey: "exitId",
      idField: "id",
      resolveEntityId: ({ exit }) => exit?.id,
    },
    relatedEntities: [
      {
        key: "exit.entries",
        entity: "PantryEntry",
        model: "pantry.entries",
        label: "Entrada",
        fieldLabels: PANTRY_ENTRY_AUDIT_FIELD_LABELS,
        valueFormatters: {
          donorId: (value, { context }) =>
            resolveDonorAuditValue(context.donorNameById, value),
          sector: (value) =>
            normalizeSector(typeof value === "string" ? value : null),
          quantity: (value) => formatAuditNumber(value),
          entryDate: (value) => formatAuditDate(value),
          expiryDate: (value) =>
            typeof value === "string" && value.trim()
              ? formatAuditDate(value)
              : "Sem validade",
          reversalOfExitId: (value) =>
            formatAuditReferenceLabel(undefined, value, "Saída"),
        },
        joinKey: "entryId",
        idField: "id",
        resolveEntityIds: ({ exit }) =>
          (exit?.allocations ?? []).map((allocation) => allocation.entryId),
      },
    ],
    sort: [{ field: "createdAt", direction: "desc" }],
    pagination: { limit: 120 },
  },
};

