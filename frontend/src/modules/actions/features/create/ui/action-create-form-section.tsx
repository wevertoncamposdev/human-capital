"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRegisterUsageDocumentation } from "@/components/UsageDocumentation/UsageDocumentationProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichText } from "@/components/ui/richtext/RichText";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/features/auth/auth-context";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import {
  createProjectAction,
  listActionTypes,
  updateProjectAction,
  type ApiProjectAction,
  type ApiActionType,
  type ActionStatus,
} from "@/modules/actions/api";
import {
  ACTION_STATUS_OPTIONS,
  ACTION_TARGET_LABELS,
} from "@/modules/actions/shared/domain/actions.constants";
import {
  listProjectEnrollments,
  listProjectGroups,
  listProjectPeopleGroups,
  listProjects,
  type ApiProject,
  type ApiProjectEnrollment,
  type ApiProjectGroup,
  type ApiProjectPeopleGroup,
} from "@/modules/projects/api";
import { ACTION_CREATE_TEXT } from "../config/action-create.constants";

const NONE_VALUE = "__none__";
const lineInputClassName =
  "h-10 rounded-none border-0 border-b border-border/60 bg-transparent px-0 shadow-none focus-visible:border-primary focus-visible:ring-0";
const fieldLabelClassName =
  "text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground";

type ActionCreateValues = {
  projectId: string;
  actionTypeId: string;
  title: string;
  status: ActionStatus;
  projectGroupId: string;
  peopleGroupId: string;
  targetEnrollmentId: string;
  plannedStartAt: string;
  plannedEndAt: string;
  planHtml: string;
};

function SectionField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className={fieldLabelClassName}>{label}</div>
      {children}
    </div>
  );
}

function formatPeopleGroupOptionLabel(row: ApiProjectPeopleGroup) {
  const primary = row.peopleGroup?.name ?? "";
  const secondaryParts = [
    row.peopleGroup?.category ?? null,
    row.peopleGroup?.description ?? null,
  ].filter(Boolean);
  return secondaryParts.length ? `${primary} - ${secondaryParts.join(" - ")}` : primary;
}

function resolveTypeTargetLabel(target: ApiActionType["target"] | undefined) {
  if (!target) return ACTION_TARGET_LABELS.PROJECT;
  return ACTION_TARGET_LABELS[target];
}

type ActionCreateFormSectionProps = {
  mode?: "create" | "edit";
  action?: ApiProjectAction | null;
  projectId?: string;
  actionId?: string;
  onSaved?: (action: ApiProjectAction) => void;
  onCancel?: () => void;
};

export function ActionCreateFormSection({
  mode = "create",
  action = null,
  projectId: projectIdProp,
  actionId: actionIdProp,
  onSaved,
  onCancel,
}: ActionCreateFormSectionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const params = useSearchParams();
  const { token } = useAuth();
  const { permissions } = useCurrentUser();
  const { isAuthenticated, isLoading: authLoading } = useRequireAuth();
  const { toast } = useToast();

  const canCreate = permissions.includes("actions.create");
  const canUpdate = permissions.includes("actions.update");
  const canAccessForm = mode === "edit" ? canUpdate : canCreate;
  const initialProjectId =
    projectIdProp ?? action?.projectId ?? params.get("projectId") ?? NONE_VALUE;

  const [projects, setProjects] = React.useState<ApiProject[]>([]);
  const [actionTypes, setActionTypes] = React.useState<ApiActionType[]>([]);
  const [groups, setGroups] = React.useState<ApiProjectGroup[]>([]);
  const [peopleGroups, setPeopleGroups] = React.useState<ApiProjectPeopleGroup[]>([]);
  const [enrollments, setEnrollments] = React.useState<ApiProjectEnrollment[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [values, setValues] = React.useState<ActionCreateValues>({
    projectId: initialProjectId,
    actionTypeId: NONE_VALUE,
    title: "",
    status: "PLANNED",
    projectGroupId: NONE_VALUE,
    peopleGroupId: NONE_VALUE,
    targetEnrollmentId: NONE_VALUE,
    plannedStartAt: "",
    plannedEndAt: "",
    planHtml: "",
  });

  const actionTypesById = React.useMemo(
    () => new Map(actionTypes.map((item) => [item.id, item])),
    [actionTypes],
  );

  const selectedType = actionTypesById.get(values.actionTypeId) ?? null;

  React.useEffect(() => {
    if (mode !== "edit" || !action) return;
    setValues({
      projectId: action.projectId ?? NONE_VALUE,
      actionTypeId: action.actionTypeId ?? NONE_VALUE,
      title: action.title ?? "",
      status: action.status ?? "PLANNED",
      projectGroupId: action.projectGroupId ?? NONE_VALUE,
      peopleGroupId: action.peopleGroupId ?? NONE_VALUE,
      targetEnrollmentId: action.targetEnrollmentId ?? NONE_VALUE,
      plannedStartAt: action.plannedStartAt?.slice(0, 10) ?? "",
      plannedEndAt: action.plannedEndAt?.slice(0, 10) ?? "",
      planHtml: action.planHtml ?? "",
    });
  }, [action, mode]);

  React.useEffect(() => {
    if (!token || !isAuthenticated || authLoading || !canAccessForm) return;
    (async () => {
      try {
        const [projectsResponse, types] = await Promise.all([
          listProjects(token, { all: true, limit: 200 }),
          listActionTypes(token, { isActive: true }),
        ]);
        const nextProjects = projectsResponse.data ?? [];
        const nextTypes = types ?? [];
        setProjects(nextProjects);
        setActionTypes(nextTypes);
        setValues((previous) => ({
          ...previous,
          projectId:
            previous.projectId !== NONE_VALUE
              ? previous.projectId
              : nextProjects.length === 1
                ? (nextProjects[0]?.id ?? NONE_VALUE)
                : NONE_VALUE,
          actionTypeId:
            previous.actionTypeId !== NONE_VALUE
              ? previous.actionTypeId
              : (nextTypes[0]?.id ?? NONE_VALUE),
        }));
      } catch (error) {
        const message =
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: string }).message)
            : ACTION_CREATE_TEXT.loadErrorFallback;
        toast({
          title: ACTION_CREATE_TEXT.loadErrorTitle,
          description: message,
          variant: "destructive",
        });
      }
    })();
  }, [authLoading, canAccessForm, isAuthenticated, toast, token]);

  React.useEffect(() => {
    if (!token || !canAccessForm) return;
    if (!values.projectId || values.projectId === NONE_VALUE) {
      setGroups([]);
      setPeopleGroups([]);
      setEnrollments([]);
      return;
    }

    (async () => {
      try {
        const [projectGroups, projectPeopleGroups, projectEnrollments] = await Promise.all([
          listProjectGroups(token, values.projectId),
          listProjectPeopleGroups(token, values.projectId, { participationKind: "PARTICIPANT" }),
          listProjectEnrollments(token, values.projectId, { page: 1, limit: 200 }),
        ]);
        setGroups(projectGroups);
        setPeopleGroups(projectPeopleGroups);
        setEnrollments(projectEnrollments.data ?? []);
      } catch {
        setGroups([]);
        setPeopleGroups([]);
        setEnrollments([]);
      }
    })();
  }, [canAccessForm, token, values.projectId]);

  const handleSubmit = async () => {
    if (!token) return;

    if (!values.projectId || values.projectId === NONE_VALUE) {
      toast({ title: ACTION_CREATE_TEXT.validations.projectRequired, variant: "destructive" });
      return;
    }

    if (!values.actionTypeId || values.actionTypeId === NONE_VALUE) {
      toast({ title: ACTION_CREATE_TEXT.validations.typeRequired, variant: "destructive" });
      return;
    }

    const resolvedType = actionTypesById.get(values.actionTypeId) ?? null;
    if (!resolvedType) {
      toast({ title: ACTION_CREATE_TEXT.validations.typeRequired, variant: "destructive" });
      return;
    }

    const title = values.title.trim();
    if (!title) {
      toast({ title: ACTION_CREATE_TEXT.validations.titleRequired, variant: "destructive" });
      return;
    }

    if (resolvedType.target === "PROJECT_GROUP" && values.projectGroupId === NONE_VALUE) {
      toast({ title: ACTION_CREATE_TEXT.validations.groupRequired, variant: "destructive" });
      return;
    }

    if (resolvedType.target === "PEOPLE_GROUP" && values.peopleGroupId === NONE_VALUE) {
      toast({ title: ACTION_CREATE_TEXT.validations.cycleRequired, variant: "destructive" });
      return;
    }

    if (resolvedType.target === "ENROLLMENT" && values.targetEnrollmentId === NONE_VALUE) {
      toast({ title: "Selecione um participante", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        actionTypeId: values.actionTypeId,
        title,
        status: values.status,
        projectGroupId:
          resolvedType.target === "PROJECT_GROUP" && values.projectGroupId !== NONE_VALUE
            ? values.projectGroupId
            : null,
        peopleGroupId:
          resolvedType.target === "PEOPLE_GROUP" && values.peopleGroupId !== NONE_VALUE
            ? values.peopleGroupId
            : null,
        targetEnrollmentId:
          resolvedType.target === "ENROLLMENT" && values.targetEnrollmentId !== NONE_VALUE
            ? values.targetEnrollmentId
            : null,
        plannedStartAt: values.plannedStartAt.trim() || null,
        plannedEndAt: values.plannedEndAt.trim() || null,
        planHtml: values.planHtml.trim() || null,
      };

      if (mode === "edit" && actionIdProp) {
        const updated = await updateProjectAction(
          token,
          projectIdProp ?? action?.projectId ?? values.projectId,
          actionIdProp,
          payload,
        );
        toast({ title: "Ação atualizada" });
        onSaved?.(updated);
      } else {
        const created = await createProjectAction(token, values.projectId, payload);
        toast({ title: ACTION_CREATE_TEXT.toasts.created });
        onSaved?.(created);
        const href = withTenantPath(`/actions/${created.id}`, tenantSlug);
        const qs = new URLSearchParams();
        qs.set("projectId", values.projectId);
        router.push(`${href}?${qs.toString()}`);
      }
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message)
          : ACTION_CREATE_TEXT.loadErrorFallback;
      toast({
        title: mode === "edit" ? "Falha ao atualizar" : ACTION_CREATE_TEXT.toasts.createFailed,
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const usageItems = React.useMemo(
    () =>
      ACTION_CREATE_TEXT.usage.sections.map((section, index) => ({
        id: `actions-create-${index}`,
        title: section.title,
        searchText: section.items.join(" "),
        content: (
          <ul className="list-disc space-y-1 pl-5">
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ),
      })),
    [],
  );

  useRegisterUsageDocumentation({
    title: ACTION_CREATE_TEXT.usage.title,
    items: usageItems,
  });

  if (!isAuthenticated || authLoading) return null;

  if (!canAccessForm) {
    return <div className="text-sm text-muted-foreground">{ACTION_CREATE_TEXT.noAccessSubtitle}</div>;
  }

  return (
    <div className="space-y-6 border-y border-border/60 bg-transparent px-0 py-4">
      <div className="grid gap-6 xl:grid-cols-2">
        <SectionField label={ACTION_CREATE_TEXT.form.projectLabel}>
          <Select
            value={values.projectId}
            onValueChange={(next) =>
              setValues((previous) => ({
                ...previous,
                projectId: next,
                projectGroupId: NONE_VALUE,
                peopleGroupId: NONE_VALUE,
                targetEnrollmentId: NONE_VALUE,
              }))
            }
            disabled={saving}
          >
            <SelectTrigger className={lineInputClassName}>
              <SelectValue placeholder={ACTION_CREATE_TEXT.form.projectPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>{ACTION_CREATE_TEXT.form.projectPlaceholder}</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SectionField>

        <SectionField label={ACTION_CREATE_TEXT.form.titleLabel}>
          <Input
            value={values.title}
            onChange={(event) =>
              setValues((previous) => ({ ...previous, title: event.target.value }))
            }
            className={lineInputClassName}
            placeholder={ACTION_CREATE_TEXT.form.titlePlaceholder}
            readOnly={saving}
          />
        </SectionField>

        <SectionField label={ACTION_CREATE_TEXT.form.typeLabel}>
          <Select
            value={values.actionTypeId}
            onValueChange={(next) =>
              setValues((previous) => ({
                ...previous,
                actionTypeId: next,
                projectGroupId: NONE_VALUE,
                peopleGroupId: NONE_VALUE,
                targetEnrollmentId: NONE_VALUE,
              }))
            }
            disabled={saving}
          >
            <SelectTrigger className={lineInputClassName}>
              <SelectValue placeholder={ACTION_CREATE_TEXT.form.typePlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>{ACTION_CREATE_TEXT.form.typePlaceholder}</SelectItem>
              {actionTypes.map((type) => (
                <SelectItem key={type.id} value={type.id}>
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SectionField>

        <SectionField label={ACTION_CREATE_TEXT.form.targetLabel}>
          <div className="flex h-10 items-center border-b border-border/60 text-sm text-foreground">
            {selectedType ? resolveTypeTargetLabel(selectedType.target) : "-"}
          </div>
        </SectionField>

        <SectionField label={ACTION_CREATE_TEXT.form.statusLabel}>
          <Select
            value={values.status}
            onValueChange={(next) =>
              setValues((previous) => ({ ...previous, status: next as ActionStatus }))
            }
            disabled={saving}
          >
            <SelectTrigger className={lineInputClassName}>
              <SelectValue placeholder={ACTION_CREATE_TEXT.form.statusLabel} />
            </SelectTrigger>
            <SelectContent>
              {ACTION_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SectionField>

        <SectionField label={ACTION_CREATE_TEXT.form.groupLabel}>
          <Select
            value={values.projectGroupId}
            onValueChange={(next) =>
              setValues((previous) => ({ ...previous, projectGroupId: next }))
            }
            disabled={saving || selectedType?.target !== "PROJECT_GROUP"}
          >
            <SelectTrigger className={lineInputClassName}>
              <SelectValue placeholder={ACTION_CREATE_TEXT.form.groupPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>{ACTION_CREATE_TEXT.form.groupPlaceholder}</SelectItem>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SectionField>

        <SectionField label={ACTION_CREATE_TEXT.form.cycleLabel}>
          <Select
            value={values.peopleGroupId}
            onValueChange={(next) =>
              setValues((previous) => ({ ...previous, peopleGroupId: next }))
            }
            disabled={saving || selectedType?.target !== "PEOPLE_GROUP"}
          >
            <SelectTrigger className={lineInputClassName}>
              <SelectValue placeholder={ACTION_CREATE_TEXT.form.cyclePlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>{ACTION_CREATE_TEXT.form.cyclePlaceholder}</SelectItem>
              {peopleGroups.map((row) => (
                <SelectItem key={row.id} value={row.peopleGroupId}>
                  {formatPeopleGroupOptionLabel(row)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SectionField>

        <SectionField label="Participante">
          <Select
            value={values.targetEnrollmentId}
            onValueChange={(next) =>
              setValues((previous) => ({ ...previous, targetEnrollmentId: next }))
            }
            disabled={saving || selectedType?.target !== "ENROLLMENT"}
          >
            <SelectTrigger className={lineInputClassName}>
              <SelectValue placeholder="Selecione um participante" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>Selecione um participante</SelectItem>
              {enrollments.map((enrollment) => (
                <SelectItem key={enrollment.id} value={enrollment.id}>
                  {enrollment.person?.fullName ?? enrollment.personId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SectionField>

        <SectionField label={ACTION_CREATE_TEXT.form.plannedStartLabel}>
          <Input
            type="date"
            value={values.plannedStartAt}
            onChange={(event) =>
              setValues((previous) => ({ ...previous, plannedStartAt: event.target.value }))
            }
            className={lineInputClassName}
            readOnly={saving}
          />
        </SectionField>

        <SectionField label={ACTION_CREATE_TEXT.form.plannedEndLabel}>
          <Input
            type="date"
            value={values.plannedEndAt}
            onChange={(event) =>
              setValues((previous) => ({ ...previous, plannedEndAt: event.target.value }))
            }
            className={lineInputClassName}
            readOnly={saving}
          />
        </SectionField>
      </div>

      <SectionField label={ACTION_CREATE_TEXT.form.planLabel}>
        <RichText
          value={values.planHtml}
          disabled={saving}
          onChange={(next) => setValues((previous) => ({ ...previous, planHtml: next }))}
        />
      </SectionField>

      <div className="flex items-center justify-end gap-2 pt-2">
        {mode === "create" || onCancel ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              onCancel ? onCancel() : router.push(withTenantPath("/actions", tenantSlug))
            }
            disabled={saving}
          >
            {ACTION_CREATE_TEXT.form.cancelLabel}
          </Button>
        ) : null}
        <Button type="button" onClick={() => void handleSubmit()} disabled={saving}>
          {saving ? "Salvando..." : mode === "edit" ? "Salvar" : ACTION_CREATE_TEXT.form.submitLabel}
        </Button>
      </div>
    </div>
  );
}

