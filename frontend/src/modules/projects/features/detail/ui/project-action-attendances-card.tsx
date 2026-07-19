"use client";

import * as React from "react";
import { ListChecks, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  listProjectActionAttendances,
  upsertProjectActionAttendances,
  type AttendanceStatus,
  type ProjectActionAttendancesListItem,
} from "@/modules/actions/api";
import { ATTENDANCE_STATUS_OPTIONS } from "@/modules/actions/shared/domain/actions.constants";
import { ACTION_RELATION_TEXT, ACTION_RELATION_VALUES } from "@/modules/actions/features/manage/config/action-relations.constants";
import {
  AttendanceNotesDialog,
  buildAttendanceGroupOptions,
  buildParticipantsColumns,
  countDistinctAttendanceGroups,
  filterAttendanceRows,
  type AttendanceDraft,
  type AttendanceNotesDialogState,
  type AttendanceStatusFilter,
} from "@/modules/actions/features/manage/ui/action-operational-relations";
import { getTenantSlugFromPath } from "@/lib/tenant-path";
import { SectionCard } from "@/components/section-card";
import { ListView } from "@/web-client/views/ListView";
import { usePathname } from "next/navigation";

type ProjectActionAttendancesCardProps = {
  token: string;
  projectId: string;
  actionId: string;
  canUpdate: boolean;
  canReadStructure: boolean;
  canReadPeople: boolean;
  canReadPeopleIdentity: boolean;
};

async function fetchAllAttendances(params: {
  token: string;
  projectId: string;
  actionId: string;
}) {
  const limit = 200;
  let page = 1;
  const rows: ProjectActionAttendancesListItem[] = [];

  while (true) {
    const response = await listProjectActionAttendances(
      params.token,
      params.projectId,
      params.actionId,
      { page, limit },
    );
    rows.push(...(response.data ?? []));
    const pages = response.pagination?.pages ?? page;
    if (page >= pages) break;
    page += 1;
  }

  return rows;
}

function matchesSearch(row: ProjectActionAttendancesListItem, query: string) {
  if (!query.trim()) return true;
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  const values = [
    row.enrollment.person.fullName,
    row.enrollment.person.sex,
    row.enrollment.person.gender,
    row.enrollment.person.raceColor,
    row.enrollment.groups.map((group) => group.name).join(", "),
    row.enrollment.peopleGroups.map((group) => group.name).join(", "),
    row.attendance?.status ?? "",
    row.attendance?.notes ?? "",
  ]
    .filter(Boolean)
    .map((value) => String(value).toLocaleLowerCase("pt-BR"));

  return values.some((value) => value.includes(normalized));
}

export function ProjectActionAttendancesCard({
  token,
  projectId,
  actionId,
  canUpdate,
  canReadPeople,
}: ProjectActionAttendancesCardProps) {
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname) ?? "";
  const { toast } = useToast();

  const [rows, setRows] = React.useState<ProjectActionAttendancesListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchText, setSearchText] = React.useState("");
  const [groupId, setGroupId] = React.useState<string>(ACTION_RELATION_VALUES.allGroups);
  const [statusFilter, setStatusFilter] = React.useState<AttendanceStatusFilter>("all");
  const [drafts, setDrafts] = React.useState<Record<string, AttendanceDraft>>({});
  const [saving, setSaving] = React.useState(false);
  const [selectionEnabled, setSelectionEnabled] = React.useState(false);
  const [notesDialog, setNotesDialog] = React.useState<AttendanceNotesDialogState | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllAttendances({ token, projectId, actionId });
      setRows(data);
      setDrafts({});
      setSelectionEnabled(false);
    } catch (loadError) {
      const message =
        loadError && typeof loadError === "object" && "message" in loadError
          ? String((loadError as { message?: string }).message)
          : "Falha ao carregar presenças.";
      setError(message);
      setRows([]);
      setDrafts({});
      setSelectionEnabled(false);
    } finally {
      setLoading(false);
    }
  }, [actionId, projectId, token]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const groupOptions = React.useMemo(() => buildAttendanceGroupOptions(rows), [rows]);

  React.useEffect(() => {
    if (!groupOptions.some((option) => option.value === groupId)) {
      setGroupId(ACTION_RELATION_VALUES.allGroups);
    }
  }, [groupId, groupOptions]);

  const visibleRows = React.useMemo(() => {
    return filterAttendanceRows(rows, {
      groupId,
      status: statusFilter,
    }).filter((row) => matchesSearch(row, searchText));
  }, [groupId, rows, searchText, statusFilter]);

  const getEffective = React.useCallback(
    (row: ProjectActionAttendancesListItem) => {
      const draftEntry = drafts[row.enrollment.id];
      return {
        status: (draftEntry?.status ?? row.attendance?.status ?? null) as AttendanceStatus | null,
        notes:
          draftEntry?.notes !== undefined
            ? draftEntry.notes
            : (row.attendance?.notes ?? null),
      };
    },
    [drafts],
  );

  const setRowDraft = React.useCallback(
    (
      row: ProjectActionAttendancesListItem,
      patch: AttendanceDraft,
      prune = false,
    ) => {
      setDrafts((previous) => {
        const next = { ...previous };
        const merged = { ...(previous[row.enrollment.id] ?? {}), ...patch };

        if (prune) {
          const originalStatus = row.attendance?.status ?? undefined;
          const originalNotes = row.attendance?.notes ?? null;
          const statusMatches =
            merged.status === undefined || merged.status === originalStatus;
          const notesMatches =
            merged.notes === undefined || merged.notes === originalNotes;

          if (statusMatches && notesMatches) {
            delete next[row.enrollment.id];
            return next;
          }
        }

        next[row.enrollment.id] = merged;
        return next;
      });
    },
    [],
  );

  const applyStatusToRows = React.useCallback(
    (items: ProjectActionAttendancesListItem[], status: AttendanceStatus) => {
      items.forEach((row) => {
        setRowDraft(row, { status }, true);
      });
    },
    [setRowDraft],
  );

  const handleSave = React.useCallback(async () => {
    if (!canUpdate) return;

    const items = Object.entries(drafts).map(([enrollmentId, entry]) => {
      const row = rows.find((item) => item.enrollment.id === enrollmentId);
      return {
        enrollmentId,
        status: entry.status ?? row?.attendance?.status ?? null,
        notes: entry.notes,
      };
    });

    if (!items.length) return;

    const missingStatus = items.find((item) => !item.status);
    if (missingStatus) {
      toast({
        title: ACTION_RELATION_TEXT.participants.savePendingTitle,
        description: ACTION_RELATION_TEXT.participants.savePendingDescription,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const result = await upsertProjectActionAttendances(
        token,
        projectId,
        actionId,
        items.map((item) => ({
          enrollmentId: item.enrollmentId,
          status: item.status as AttendanceStatus,
          ...(item.notes !== undefined ? { notes: item.notes } : {}),
        })),
      );
      setDrafts({});
      setNotesDialog(null);
      toast({
        title: ACTION_RELATION_TEXT.participants.saveOkTitle,
        description: ACTION_RELATION_TEXT.participants.saveOkDescription(
          result.created,
          result.updated,
        ),
      });
      await load();
    } catch (saveError) {
      const message =
        saveError && typeof saveError === "object" && "message" in saveError
          ? String((saveError as { message?: string }).message)
          : "Falha ao salvar presenças.";
      toast({ title: "Falha ao salvar", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [actionId, canUpdate, drafts, load, projectId, rows, toast, token]);

  const columns = React.useMemo(
    () =>
      buildParticipantsColumns({
        canUpdate,
        canReadPeople,
        tenantSlug,
        getEffective,
        onSetRowDraft: setRowDraft,
        onOpenNotesDialog: (row) =>
          setNotesDialog({
            enrollmentId: row.enrollment.id,
            fullName: row.enrollment.person.fullName,
            status: getEffective(row).status ?? "",
            notes: getEffective(row).notes ?? "",
          }),
      }),
    [canReadPeople, canUpdate, getEffective, setRowDraft, tenantSlug],
  );

  return (
    <SectionCard title={ACTION_RELATION_TEXT.participants.relationLabel}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-0 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder={ACTION_RELATION_TEXT.participants.searchPlaceholder}
                className="h-9 rounded-none border-x-0 border-t-0 border-border/70 pl-6 pr-12 text-sm shadow-none focus-visible:ring-0"
              />
              <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[11px] font-medium tabular-nums text-muted-foreground">
                {visibleRows.length.toLocaleString("pt-BR")}
              </span>
            </div>
          </div>

          <div className="min-w-[220px] space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {ACTION_RELATION_TEXT.participants.groupFilterLabel}
            </div>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger className="h-9 min-w-[220px]">
                <SelectValue placeholder={ACTION_RELATION_TEXT.participants.allGroups} />
              </SelectTrigger>
              <SelectContent>
                {groupOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[220px] space-y-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {ACTION_RELATION_TEXT.participants.statusFilterLabel}
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as AttendanceStatusFilter)}
            >
              <SelectTrigger className="h-9 min-w-[220px]">
                <SelectValue placeholder={ACTION_RELATION_TEXT.participants.allStatuses} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{ACTION_RELATION_TEXT.participants.allStatuses}</SelectItem>
                <SelectItem value="not_recorded">
                  {ACTION_RELATION_TEXT.participants.notRecorded}
                </SelectItem>
                {ATTENDANCE_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {canUpdate ? (
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={selectionEnabled ? "secondary" : "outline"}
                className="h-9 rounded-none"
                onClick={() => setSelectionEnabled((previous) => !previous)}
                disabled={saving}
              >
                <ListChecks className="mr-2 size-4" />
                {selectionEnabled
                  ? ACTION_RELATION_TEXT.participants.selectionOff
                  : ACTION_RELATION_TEXT.participants.selectionOn}
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-9 rounded-none"
                onClick={() => void handleSave()}
                disabled={saving || Object.keys(drafts).length === 0}
              >
                {saving ? "Salvando..." : ACTION_RELATION_TEXT.participants.save}
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="min-w-[108px] border border-border/60 bg-muted/10 px-3 py-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {ACTION_RELATION_TEXT.participants.stats.total}
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">
              {rows.length}
            </div>
          </div>
          <div className="min-w-[108px] border border-border/60 bg-muted/10 px-3 py-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {ACTION_RELATION_TEXT.participants.stats.filtered}
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">
              {visibleRows.length}
            </div>
          </div>
          <div className="min-w-[108px] border border-border/60 bg-muted/10 px-3 py-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {ACTION_RELATION_TEXT.participants.stats.groups}
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">
              {countDistinctAttendanceGroups(visibleRows)}
            </div>
          </div>
          <div className="min-w-[108px] border border-border/60 bg-muted/10 px-3 py-2">
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {ACTION_RELATION_TEXT.participants.stats.changed}
            </div>
            <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">
              {Object.keys(drafts).length}
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-lg border border-border/60 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
            Carregando...
          </div>
        ) : (
          <div className="min-h-[420px]">
            <ListView<ProjectActionAttendancesListItem>
              data={visibleRows}
              columns={columns}
              className="h-full"
              getRowId={(row) => row.enrollment.id}
              enableRowSelection={selectionEnabled}
              bulkActions={
                selectionEnabled
                  ? (selectedRows) => (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => applyStatusToRows(selectedRows, "PRESENT")}
                        >
                          {ACTION_RELATION_TEXT.participants.bulk.present}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => applyStatusToRows(selectedRows, "ABSENT")}
                        >
                          {ACTION_RELATION_TEXT.participants.bulk.absent}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => applyStatusToRows(selectedRows, "EXCUSED")}
                        >
                          {ACTION_RELATION_TEXT.participants.bulk.excused}
                        </Button>
                      </>
                    )
                  : undefined
              }
            />
          </div>
        )}
      </div>

      <AttendanceNotesDialog
        state={notesDialog}
        canUpdate={canUpdate}
        onOpenChange={(open) => {
          if (!open) setNotesDialog(null);
        }}
        onStateChange={setNotesDialog}
        onConfirm={(state) => {
          const row = rows.find((item) => item.enrollment.id === state.enrollmentId);
          if (!row) {
            setNotesDialog(null);
            return;
          }

          setRowDraft(
            row,
            {
              ...(state.status ? { status: state.status as AttendanceStatus } : {}),
              notes: state.notes.trim() ? state.notes.trim() : null,
            },
            true,
          );
          setNotesDialog(null);
        }}
      />
    </SectionCard>
  );
}
