"use client";

import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/section-card";
import { SectionDialog } from "@/components/section-dialog";
import { SectionList, SectionListItem } from "@/components/section-list";
import { useConfirm } from "@/components/confirm/use-confirm";
import { useToast } from "@/components/ui/use-toast";
import {
  ACTION_STATUS_LABELS,
  deleteProjectAction,
  getProjectAction,
  type ApiProjectAction,
  type ActionStatus,
} from "@/modules/actions";
import { formatDateOnlyPtBR } from "@/lib/date";
import { ProjectActionAttendancesCard } from "./project-action-attendances-card";

function formatDate(value: string | null) {
  return formatDateOnlyPtBR(value);
}

function formatPeriod(start: string | null, end: string | null) {
  if (!start && !end) return "—";
  if (start && end) return `${formatDate(start)} — ${formatDate(end)}`;
  return start ? `${formatDate(start)} —` : `— ${formatDate(end)}`;
}

function resolveStatusBadge(status: ActionStatus) {
  const label = ACTION_STATUS_LABELS[status] ?? status;
  switch (status) {
    case "CANCELED":
      return <Badge variant="outline">{label}</Badge>;
    case "EXECUTED":
      return <Badge variant="secondary">{label}</Badge>;
    case "PLANNED":
    default:
      return (
        <Badge className="border-transparent bg-blue-600 text-white">
          {label}
        </Badge>
      );
  }
}

type ProjectActionManageDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  projectId: string;
  actionId: string | null;
  canUpdate: boolean;
  canDelete: boolean;
  canReadStructure: boolean;
  canReadPeople: boolean;
  canReadPeopleIdentity: boolean;
  onEditRequested?: (action: ApiProjectAction) => void;
  onDeleted?: () => void;
};

export function ProjectActionManageDialog({
  open,
  onOpenChange,
  token,
  projectId,
  actionId,
  canUpdate,
  canDelete,
  canReadStructure,
  canReadPeople,
  canReadPeopleIdentity,
  onEditRequested,
  onDeleted,
}: ProjectActionManageDialogProps) {
  const { confirm } = useConfirm();
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [action, setAction] = React.useState<ApiProjectAction | null>(null);

  const load = React.useCallback(async () => {
    if (!actionId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getProjectAction(token, projectId, actionId);
      setAction(data);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Falha ao carregar ação.";
      setError(message);
      setAction(null);
    } finally {
      setLoading(false);
    }
  }, [token, projectId, actionId]);

  React.useEffect(() => {
    if (!open) return;
    load();
  }, [open, load]);

  const handleDelete = React.useCallback(async () => {
    if (!action || !canDelete) return;
    const confirmed = await confirm({
      title: "Excluir ação",
      description: `Excluir a ação "${action.title}"?`,
      confirmLabel: "Excluir",
      cancelLabel: "Cancelar",
      confirmVariant: "destructive",
    });
    if (!confirmed) return;
    try {
      await deleteProjectAction(token, projectId, action.id);
      toast({ title: "Ação excluída" });
      onOpenChange(false);
      onDeleted?.();
    } catch (err) {
      toast({
        title: "Falha ao excluir",
        description:
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message)
            : "Tente novamente.",
        variant: "destructive",
      });
    }
  }, [action, canDelete, confirm, onDeleted, onOpenChange, projectId, toast, token]);

  const title = action?.title ?? "Ação";

  return (
    <SectionDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setError(null);
          setAction(null);
        }
      }}
      title={title}
      description="Gerencie a ação e registre presenças."
      contentClassName="max-w-[min(96vw,72rem)]"
      headerSlot={
        action ? (
          <>
            {canUpdate ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  onOpenChange(false);
                  onEditRequested?.(action);
                }}
              >
                <Pencil className="mr-2 size-4" />
                Editar
              </Button>
            ) : null}
            {canDelete ? (
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 size-4" />
                Excluir
              </Button>
            ) : null}
          </>
        ) : null
      }
    >
      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : null}

      {action ? (
        <>
          <SectionCard title="Resumo" subtitle="Contexto rápido da ação.">
            <SectionList>
              <SectionListItem
                title={
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{action.title}</span>
                    {resolveStatusBadge(action.status)}
                  </div>
                }
                subtitle={action.description ?? "Sem descrição"}
                meta={
                  <>
                    <span>
                      Tipo: <strong>{action.actionType?.name ?? "—"}</strong>
                    </span>
                    <span>
                      Grupo de Pessoas:{" "}
                      <strong>
                        {action.peopleGroup?.name ?? "—"}
                      </strong>
                    </span>
                    <span>
                      Planejamento:{" "}
                      <strong>
                        {formatPeriod(action.plannedStartAt, action.plannedEndAt)}
                      </strong>
                    </span>
                    <span>
                      Execução:{" "}
                      <strong>
                        {formatPeriod(action.executedStartAt, action.executedEndAt)}
                      </strong>
                    </span>
                  </>
                }
              />
            </SectionList>
          </SectionCard>

          <ProjectActionAttendancesCard
            token={token}
            projectId={projectId}
            actionId={action.id}
            canUpdate={canUpdate}
            canReadStructure={canReadStructure}
            canReadPeople={canReadPeople}
            canReadPeopleIdentity={canReadPeopleIdentity}
          />
        </>
      ) : null}
    </SectionDialog>
  );
}
