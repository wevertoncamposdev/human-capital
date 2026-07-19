"use client";

import * as React from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/confirm/use-confirm";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/features/auth/auth-context";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import type { ApiProject, ApiProjectEnrollment, ApiProjectGroup } from "@/modules/projects/api";
import {
  addEnrollmentToGroup,
  createProjectGroup,
  deleteProjectGroup,
  getProject,
  listAllProjectGroups,
  listProjectEnrollments,
  listProjects,
  removeEnrollmentFromGroup,
  updateProjectGroup,
} from "@/modules/projects/api";
import {
  PROJECT_GROUPS_ROUTES,
  projectGroupsDetailModuleDefinition,
} from "@/modules/projects/config/project-groups-module-contract";
import {
  type ProjectGroupDetailDraft,
  type ProjectGroupsDetailLayoutContext,
} from "@/modules/projects/config/project-groups-detail-layout-contract";
import { ProjectEnrollmentPickerDialog } from "@/modules/projects/features/detail/ui/project-enrollment-picker-dialog";
import { createRestDataProvider } from "@/web-client/data-provider";
import { DetailShellEngine } from "@/web-client/detail/DetailShellEngine";
import { useDetailAutoSaveController } from "@/web-client/detail/useDetailAutoSaveController";
import { canUseModuleAction, hasModulePermission } from "@/web-client/registry/module-utils";

function buildDraft(group?: ApiProjectGroup | null, projectId?: string | null): ProjectGroupDetailDraft {
  return {
    projectId: projectId ?? group?.projectId ?? "",
    name: group?.name ?? "",
    description: group?.description ?? "",
    internalNotes: group?.internalNotes ?? null,
  };
}

function normalizeDraft(draft: ProjectGroupDetailDraft): ProjectGroupDetailDraft {
  return {
    projectId: draft.projectId.trim(),
    name: draft.name.trim(),
    description: draft.description.trim(),
    internalNotes: draft.internalNotes?.trim() ? draft.internalNotes.trim() : null,
  };
}

export function ProjectGroupsDetailEngineClientPage({
  forcedProjectId,
  forcedGroupId,
  returnToOverride,
}: {
  forcedProjectId?: string;
  forcedGroupId?: string;
  returnToOverride?: string;
} = {}) {
  const params = useParams<{ id?: string }>();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const tenantSlug = getTenantSlugFromPath(pathname) ?? "";
  const { token } = useAuth();
  const { permissions } = useCurrentUser();
  const { toast } = useToast();
  const { confirm } = useConfirm();

  const routeId = params?.id ? String(params.id) : "";
  const resolvedId =
    forcedGroupId ?? (routeId && routeId !== "new" ? routeId : searchParams.get("groupId") ?? "");
  const resolvedProjectId = forcedProjectId ?? searchParams.get("projectId") ?? "";
  const mode = resolvedId ? "edit" : "create";

  const canRead = hasModulePermission(projectGroupsDetailModuleDefinition, "canRead", permissions);
  const canCreate = canUseModuleAction(projectGroupsDetailModuleDefinition, "create", permissions);
  const canEdit = canUseModuleAction(projectGroupsDetailModuleDefinition, "edit", permissions);
  const canDelete = canUseModuleAction(projectGroupsDetailModuleDefinition, "delete", permissions);
  const canAudit = canUseModuleAction(projectGroupsDetailModuleDefinition, "audit", permissions);
  const canReadProjects = permissions.includes("projects.read");
  const canReadEnrollments = permissions.includes("enrollments.read");
  const canUpdateEnrollments = permissions.includes("enrollments.update");

  const canAccessPage = mode === "create" ? canCreate : canRead;
  const dataProvider = React.useMemo(() => createRestDataProvider({ token }), [token]);

  const [project, setProject] = React.useState<ApiProject | null>(null);
  const [projects, setProjects] = React.useState<ApiProject[]>([]);
  const [group, setGroup] = React.useState<ApiProjectGroup | null>(null);
  const [draft, setDraft] = React.useState<ProjectGroupDetailDraft>(buildDraft(null, resolvedProjectId));
  const [rows, setRows] = React.useState<ApiProjectEnrollment[]>([]);
  const [historyRows, setHistoryRows] = React.useState<ApiProjectEnrollment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [participantsLoading, setParticipantsLoading] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [auditVisibleCount, setAuditVisibleCount] = React.useState(24);

  const returnTo = React.useMemo(() => {
    if (returnToOverride) return returnToOverride;
    if (resolvedProjectId) {
      return withTenantPath(`/projects/${resolvedProjectId}`, tenantSlug);
    }
    return withTenantPath(PROJECT_GROUPS_ROUTES.list, tenantSlug);
  }, [resolvedProjectId, returnToOverride, tenantSlug]);

  const loadParticipants = React.useCallback(async () => {
    if (!token || !resolvedProjectId || !resolvedId || !canReadEnrollments) {
      setRows([]);
      setHistoryRows([]);
      return;
    }
    setParticipantsLoading(true);
    try {
      const response = await listProjectEnrollments(token, resolvedProjectId, {
        groupHistoryId: resolvedId,
        page: 1,
        limit: 200,
      });
      const active = response.data.filter((enrollment) =>
        enrollment.groupMembershipHistory.some(
          (membership) =>
            membership.group.id === resolvedId &&
            membership.isActive &&
            !membership.deletedAt,
        ),
      );
      const history = response.data.filter((enrollment) =>
        enrollment.groupMembershipHistory.some(
          (membership) =>
            membership.group.id === resolvedId &&
            (!membership.isActive || Boolean(membership.deletedAt)),
        ),
      );
      setRows(active);
      setHistoryRows(history);
    } catch {
      setRows([]);
      setHistoryRows([]);
    } finally {
      setParticipantsLoading(false);
    }
  }, [canReadEnrollments, resolvedId, resolvedProjectId, token]);

  const persistDraft = React.useCallback(
    async (nextDraft: ProjectGroupDetailDraft) => {
      if (!token || !resolvedProjectId || !resolvedId) return normalizeDraft(nextDraft);
      const normalized = normalizeDraft(nextDraft);
      const updated = await updateProjectGroup(token, resolvedProjectId, resolvedId, {
        name: normalized.name,
        description: normalized.description || null,
        internalNotes: normalized.internalNotes,
      });
      const savedDraft = buildDraft(updated, resolvedProjectId);
      setGroup(updated);
      setDraft(savedDraft);
      return savedDraft;
    },
    [resolvedId, resolvedProjectId, token],
  );

  const autoSave = useDetailAutoSaveController<ProjectGroupDetailDraft>({
    draft,
    enabled: mode === "edit" && canEdit,
    config: projectGroupsDetailModuleDefinition.detailLayout?.editing,
    normalizeDraft,
    onSave: persistDraft,
    onError: (error) => {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Falha ao salvar grupo de participantes.";
      toast({ variant: "destructive", title: "Falha ao salvar", description: message });
    },
  });
  const { saving: autoSaving, replaceSavedDraft, commitField } = autoSave;
  const saving = busy || autoSaving;

  React.useEffect(() => {
    setAuditVisibleCount(24);
  }, [resolvedId, mode]);

  React.useEffect(() => {
    if (!token || !canAccessPage) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function loadPage() {
      setLoading(true);
      try {
        const authToken = token!;
        const availableProjects = canReadProjects
          ? await listProjects(authToken, { all: true }).then((response) => response.data ?? [])
          : [];
        if (cancelled) return;
        setProjects(availableProjects);

        if (mode === "edit" && resolvedId) {
          const allGroups = await listAllProjectGroups(authToken, { all: true });
          const selected = allGroups.data.find((item) => item.id === resolvedId) ?? null;
          if (!selected) throw new Error("Grupo de participantes não encontrado.");

          const nextProject =
            availableProjects.find((item) => item.id === selected.projectId) ??
            (selected.projectId ? await getProject(authToken, selected.projectId) : null);
          if (cancelled) return;
          setGroup(selected);
          setProject(nextProject ?? null);
          const nextDraft = buildDraft(selected, selected.projectId);
          setDraft(nextDraft);
          replaceSavedDraft(nextDraft);
        } else {
          const nextProject =
            availableProjects.find((item) => item.id === resolvedProjectId) ??
            (resolvedProjectId ? await getProject(authToken, resolvedProjectId) : null);
          if (cancelled) return;
          setGroup(null);
          setProject(nextProject ?? null);
          const nextDraft = buildDraft(null, nextProject?.id ?? resolvedProjectId);
          setDraft(nextDraft);
          replaceSavedDraft(nextDraft);
        }
      } catch (error) {
        const message =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : "Falha ao carregar grupo de participantes.";
        if (!cancelled) {
          toast({ variant: "destructive", title: "Falha ao carregar", description: message });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPage();
    return () => {
      cancelled = true;
    };
  }, [
    canAccessPage,
    canReadProjects,
    mode,
    replaceSavedDraft,
    resolvedId,
    resolvedProjectId,
    toast,
    token,
  ]);

  React.useEffect(() => {
    void loadParticipants();
  }, [loadParticipants]);

  const handleCreate = React.useCallback(async () => {
    if (!token || !canCreate) return;
    const normalized = normalizeDraft(draft);
    if (!normalized.projectId) {
      toast({
        variant: "destructive",
        title: "Dados inválidos",
        description: "Selecione o projeto do grupo de participantes.",
      });
      return;
    }
    if (!normalized.name) {
      toast({
        variant: "destructive",
        title: "Dados inválidos",
        description: "Informe o nome do grupo de participantes.",
      });
      return;
    }

    setBusy(true);
    try {
      const created = await createProjectGroup(token, normalized.projectId, {
        name: normalized.name,
        description: normalized.description || null,
        internalNotes: normalized.internalNotes,
      });
      toast({ title: "Grupo de participantes criado" });
      router.replace(
        withTenantPath(
          `${PROJECT_GROUPS_ROUTES.detail}/${encodeURIComponent(created.id)}?returnTo=${encodeURIComponent(returnTo)}`,
          tenantSlug,
        ),
      );
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Falha ao criar grupo de participantes.";
      toast({ variant: "destructive", title: "Falha ao criar", description: message });
    } finally {
      setBusy(false);
    }
  }, [canCreate, draft, returnTo, router, tenantSlug, toast, token]);

  const handleDelete = React.useCallback(async () => {
    if (!token || !resolvedProjectId || !resolvedId || !canDelete) return;
    const confirmed = await confirm({
      title: "Excluir grupo",
      description: `Excluir o grupo "${group?.name ?? ""}"?`,
      confirmLabel: "Excluir",
      cancelLabel: "Cancelar",
      confirmVariant: "destructive",
    });
    if (!confirmed) return;
    try {
      await deleteProjectGroup(token, resolvedProjectId, resolvedId);
      toast({ title: "Grupo excluído" });
      router.push(returnTo);
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : "Falha ao excluir grupo.";
      toast({ variant: "destructive", title: "Falha ao excluir", description: message });
    }
  }, [canDelete, confirm, group?.name, resolvedId, resolvedProjectId, returnTo, router, toast, token]);

  const handlePickEnrollment = React.useCallback(
    async (enrollment: ApiProjectEnrollment) => {
      if (!token || !resolvedProjectId || !resolvedId) return;
      try {
        await addEnrollmentToGroup(token, resolvedProjectId, enrollment.id, {
          groupId: resolvedId,
        });
        toast({ title: "Participante adicionado" });
        await loadParticipants();
      } catch (error) {
        const message =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : "Falha ao adicionar participante.";
        toast({ variant: "destructive", title: "Falha ao adicionar", description: message });
      }
    },
    [loadParticipants, resolvedId, resolvedProjectId, toast, token],
  );

  const handleBulkPickEnrollment = React.useCallback(
    async (enrollments: ApiProjectEnrollment[]) => {
      for (const enrollment of enrollments) {
        await handlePickEnrollment(enrollment);
      }
    },
    [handlePickEnrollment],
  );

  const handleEndMembership = React.useCallback(
    async (enrollment: ApiProjectEnrollment) => {
      if (!token || !resolvedProjectId || !resolvedId || !canUpdateEnrollments) return;
      const confirmed = await confirm({
        title: "Encerrar vínculo",
        description: `Encerrar o vínculo de "${enrollment.person.fullName}" com este grupo preservando o histórico?`,
        confirmLabel: "Encerrar",
        cancelLabel: "Cancelar",
        confirmVariant: "destructive",
      });
      if (!confirmed) return;
      try {
        await removeEnrollmentFromGroup(token, resolvedProjectId, enrollment.id, resolvedId);
        toast({ title: "Vínculo encerrado" });
        await loadParticipants();
      } catch (error) {
        const message =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : "Falha ao encerrar vínculo.";
        toast({ variant: "destructive", title: "Falha ao encerrar", description: message });
      }
    },
    [canUpdateEnrollments, confirm, loadParticipants, resolvedId, resolvedProjectId, toast, token],
  );

  const context = React.useMemo<ProjectGroupsDetailLayoutContext>(
    () => ({
      mode,
      readOnly: mode === "create" ? !canCreate : !canEdit,
      canAudit,
      canManageParticipants: Boolean(resolvedId) && canUpdateEnrollments,
      tenantSlug,
      project,
      projects,
      group,
      draft,
      setDraft,
      rows,
      historyRows,
      participantsLoading,
      onCommitField: (field, nextValue) => void commitField(field, nextValue),
      onNotesChange: (next) => setDraft((previous) => ({ ...previous, internalNotes: next })),
      onNotesBlur: () => void commitField("internalNotes"),
      onOpenPerson: (personId) =>
        router.push(
          withTenantPath(`/people/${personId}?returnTo=${encodeURIComponent(pathname)}`, tenantSlug),
        ),
      onCreateParticipant: () => setPickerOpen(true),
      onEndMembership: handleEndMembership,
      auditVisibleCount,
      onAuditVisibleCountChange: setAuditVisibleCount,
    }),
    [
      auditVisibleCount,
      canAudit,
      canCreate,
      canEdit,
      canUpdateEnrollments,
      commitField,
      draft,
      group,
      handleEndMembership,
      historyRows,
      mode,
      participantsLoading,
      pathname,
      project,
      projects,
      resolvedId,
      router,
      rows,
      tenantSlug,
    ],
  );

  if (!canAccessPage) {
    return <div className="px-4 py-6 text-sm text-muted-foreground">Sem permissão.</div>;
  }

  const headerTitle =
    mode === "create"
      ? "Novo grupo de participantes"
      : group?.name || draft.name || "Grupo de Participantes";

  return (
    <>
      <DetailShellEngine<ProjectGroupsDetailLayoutContext>
        moduleDefinition={projectGroupsDetailModuleDefinition}
        context={context}
        dataProvider={dataProvider}
        auditEnabled={canAudit}
        mode={mode}
        headerTitle={headerTitle}
        saving={saving}
        loading={loading}
        readOnly={context.readOnly}
        onSave={mode === "create" ? handleCreate : undefined}
        onClose={() => router.push(returnTo)}
        breadcrumbTitle={headerTitle}
        breadcrumbItems={[
          { label: "Grupos", href: PROJECT_GROUPS_ROUTES.list },
          ...(mode === "edit" ? [{ label: headerTitle }] : []),
        ]}
        headerActionsSlot={
          mode === "edit" && canDelete ? (
            <Button type="button" variant="outline" onClick={handleDelete}>
              Excluir
            </Button>
          ) : null
        }
      />
      {mode === "edit" && token && resolvedProjectId ? (
        <ProjectEnrollmentPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          token={token}
          projectId={resolvedProjectId}
          title="Adicionar participante"
          actionLabel="Adicionar"
          excludeGroupId={resolvedId}
          onPick={handlePickEnrollment}
          onBulkPick={handleBulkPickEnrollment}
        />
      ) : null}
    </>
  );
}
