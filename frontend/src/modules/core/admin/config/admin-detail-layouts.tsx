"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { RichText } from "@/components/ui/richtext/RichText";
import { RichTextReadonly } from "@/components/ui/richtext/RichTextReadonly";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  RBAC_ACTION_LABELS,
  RBAC_ACTION_ORDER,
  RBAC_MODULE_LABELS,
  splitPermissionKey,
} from "@/features/admin/config/rbac.constants";
import { resolveMediaUrl } from "@/lib/api";
import { formatDateOnlyPtBR, formatDateTimePtBR } from "@/lib/date";
import { cn, repairTextDecoding } from "@/lib/utils";
import type {
  AdminAuditRecord,
  AdminPermissionRecord,
  AdminRoleFormDraft,
  AdminRolePermissionOption,
  AdminRoleRecord,
  AdminSettingsOverviewRecord,
  AdminTenantFormDraft,
  AdminTenantRecord,
  AdminUserFormDraft,
  AdminUserRecord,
  AdminUserRoleOption,
} from "@/modules/core/admin/admin.types";
import type { DetailShellAuditContext } from "@/web-client/detail/DetailShellEngine";
import { DetailIdentityMediaField } from "@/web-client/detail/DetailIdentityMediaField";
import { StandardDetailMetadataSide } from "@/web-client/detail/StandardDetailMetadataSide";
import type {
  DetailHistoryItem,
  DetailLayoutConfig,
} from "@/web-client/registry/types";
import { ModuleMetricsStrip, type ModuleMetricItem } from "@/web-client/ui/ModuleMetricsStrip";
import { ModuleEmptyState, ModuleSectionHeader, ModuleSurface } from "@/web-client/ui/ModulePrimitives";

const AUTO_EDITING = {
  saveMode: "auto",
  autoSave: {
    trigger: "field-commit",
  },
} as const;

const lineInputClassName =
  "h-10 rounded-none border-0 border-b border-border/60 bg-transparent px-0 shadow-none focus-visible:border-primary focus-visible:ring-0";
const lineTextareaClassName =
  "min-h-[120px] rounded-none border-0 border-b border-border/60 bg-transparent px-0 py-3 shadow-none resize-none focus-visible:border-primary focus-visible:ring-0";
const fieldLabelClassName =
  "text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground";
const summaryValueClassName = "text-sm text-foreground";

function buildMetadataHistoryItems(
  entries: Array<{
    key: string;
    title: string;
    description?: React.ReactNode;
    meta?: React.ReactNode;
    createdAt?: string | null | undefined;
  }>,
): DetailHistoryItem[] {
  return entries
    .filter((entry) => Boolean(entry.createdAt))
    .map((entry) => ({
      id: entry.key,
      title: entry.title,
      description: entry.description,
      meta: entry.meta,
      createdAt: entry.createdAt ?? null,
    }));
}

function normalizePermissionModules(permissionKeys: string[]) {
  const grouped = new Map<string, string[]>();

  permissionKeys.forEach((permissionKey) => {
    const parsed = splitPermissionKey(permissionKey);
    if (!parsed) return;
    const actions = grouped.get(parsed.moduleKey) ?? [];
    actions.push(parsed.action);
    grouped.set(parsed.moduleKey, actions);
  });

  return Array.from(grouped.entries())
    .map(([moduleKey, actions]) => ({
      moduleKey,
      moduleLabel: repairTextDecoding(RBAC_MODULE_LABELS[moduleKey] ?? moduleKey) ?? moduleKey,
      actions: Array.from(new Set(actions)).sort((left, right) => left.localeCompare(right)),
    }))
    .sort((left, right) => left.moduleLabel.localeCompare(right.moduleLabel));
}

function BooleanBadge({
  value,
  trueLabel = "Ativo",
  falseLabel = "Inativo",
}: {
  value: boolean;
  trueLabel?: string;
  falseLabel?: string;
}) {
  return (
    <Badge
      className={cn(
        "rounded-full px-2 text-[10px]",
        value
          ? "border-transparent bg-emerald-500/10 text-emerald-700"
          : "border-transparent bg-slate-500/10 text-slate-700",
      )}
    >
      {value ? trueLabel : falseLabel}
    </Badge>
  );
}

function SectionField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className={fieldLabelClassName}>{label}</div>
      {children}
    </div>
  );
}

function getInitials(value: string) {
  return value
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function OverviewMain({
  record,
  canReadInstitution,
  canReadUsers,
  canReadRoles,
  canReadAudit,
  onOpenInstitution,
  onOpenUsers,
  onOpenRoles,
  onOpenAudit,
}: Omit<AdminOverviewLayoutContext, keyof DetailShellAuditContext>) {
  const items = React.useMemo<ModuleMetricItem[]>(
    () => [
      {
        key: "users",
        label: "Usuários",
        value: record.usersTotal,
        description: `${record.activeUsersTotal} ativos`,
        tone: "info",
        onClick: canReadUsers ? onOpenUsers : undefined,
      },
      {
        key: "roles",
        label: "Perfis",
        value: record.rolesTotal,
        description: "Estrutura de acesso",
        tone: "warning",
        onClick: canReadRoles ? onOpenRoles : undefined,
      },
      {
        key: "permissions",
        label: "Permissões",
        value: record.permissionsTotal,
        description: "Chaves registradas",
        tone: "default",
      },
      {
        key: "inactive",
        label: "Inativos",
        value: record.inactiveUsersTotal,
        description: "Usuários fora de operação",
        tone: record.inactiveUsersTotal ? "danger" : "success",
      },
      {
        key: "audit",
        label: "Auditoria",
        value: canReadAudit ? "Ativa" : "Restrita",
        description: "Rastreabilidade do módulo",
        tone: canReadAudit ? "success" : "default",
        onClick: canReadAudit ? onOpenAudit : undefined,
      },
    ],
    [
      canReadAudit,
      canReadRoles,
      canReadUsers,
      onOpenAudit,
      onOpenRoles,
      onOpenUsers,
      record.activeUsersTotal,
      record.inactiveUsersTotal,
      record.permissionsTotal,
      record.rolesTotal,
      record.usersTotal,
    ],
  );

  return (
    <div className="space-y-6">
      <ModuleMetricsStrip items={items} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.38fr)]">
        <ModuleSurface className="p-4">
          <ModuleSectionHeader
            title="Resumo da administração"
            actionSlot={
              canReadInstitution ? (
                <Button variant="outline" size="sm" onClick={onOpenInstitution}>
                  Abrir instituição
                </Button>
              ) : null
            }
          />

          <div className="grid gap-4 pt-4 md:grid-cols-2">
            <SectionField label="Instituicao">
              <div className={summaryValueClassName}>{record.name}</div>
            </SectionField>
            <SectionField label="Status">
              <div className={summaryValueClassName}>{record.status ?? "-"}</div>
            </SectionField>
            <SectionField label="Slug">
              <div className="font-mono text-sm text-foreground">{record.slug ?? "-"}</div>
            </SectionField>
            <SectionField label="CNPJ">
              <div className={summaryValueClassName}>{record.cnpj ?? "-"}</div>
            </SectionField>
            <SectionField label="Ano de inicio">
              <div className={summaryValueClassName}>{record.startYear ?? "-"}</div>
            </SectionField>
            <SectionField label="Atualizado">
              <div className={summaryValueClassName}>{formatDateTimePtBR(record.updatedAt)}</div>
            </SectionField>
          </div>
        </ModuleSurface>

        <ModuleSurface className="p-4">
          <ModuleSectionHeader title="Navegação" />
          <div className="grid gap-2 pt-4">
            <Button variant="ghost" className="justify-between rounded-none px-0" onClick={onOpenInstitution} disabled={!canReadInstitution}>
              Instituicao
              <span className="text-xs text-muted-foreground">Detalhe</span>
            </Button>
            <Button variant="ghost" className="justify-between rounded-none px-0" onClick={onOpenUsers} disabled={!canReadUsers}>
              Usuários
              <span className="text-xs text-muted-foreground">{record.usersTotal}</span>
            </Button>
            <Button variant="ghost" className="justify-between rounded-none px-0" onClick={onOpenRoles} disabled={!canReadRoles}>
              Perfis
              <span className="text-xs text-muted-foreground">{record.rolesTotal}</span>
            </Button>
            <Button variant="ghost" className="justify-between rounded-none px-0" onClick={onOpenAudit} disabled={!canReadAudit}>
              Auditoria
              <span className="text-xs text-muted-foreground">Logs</span>
            </Button>
          </div>
        </ModuleSurface>
      </div>

      <ModuleSurface className="p-4">
        <ModuleSectionHeader title="Descrição" />
        <div className="pt-4">
          {record.description ? (
            <RichTextReadonly value={record.description} bodyClassName="max-h-none" />
          ) : (
            <ModuleEmptyState
              title={null}
              description="Nenhuma descrição institucional cadastrada."
              compact
              className="border border-dashed border-border/50"
            />
          )}
        </div>
      </ModuleSurface>
    </div>
  );
}

function OverviewSide({
  record,
  canReadUsers,
  canReadRoles,
  canReadAudit,
}: Pick<AdminOverviewLayoutContext, "record" | "canReadUsers" | "canReadRoles" | "canReadAudit">) {
  return (
    <StandardDetailMetadataSide
      mode="edit"
      readOnly
      history={{
        items: buildMetadataHistoryItems([
          {
            key: "overview:created",
            title: "Configuracoes registradas",
            description: "Base institucional cadastrada.",
            createdAt: record.createdAt ?? null,
          },
          {
            key: "overview:updated",
            title: "Configuracoes atualizadas",
            description: "Indicadores administrativos revisados.",
            createdAt:
              record.updatedAt && record.updatedAt !== record.createdAt
                ? record.updatedAt
                : null,
          },
        ]),
      }}
      contextPanel={
        <div className="space-y-4">
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Usuários ativos</span>
              <span className="text-foreground">{record.activeUsersTotal}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Usuários inativos</span>
              <span className="text-foreground">{record.inactiveUsersTotal}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Perfis</span>
              <span className="text-foreground">{record.rolesTotal}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Permissões</span>
              <span className="text-foreground">{record.permissionsTotal}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Acesso a usuários</span>
              <span className="text-foreground">{canReadUsers ? "Sim" : "Nao"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Acesso a perfis</span>
              <span className="text-foreground">{canReadRoles ? "Sim" : "Nao"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Acesso a auditoria</span>
              <span className="text-foreground">{canReadAudit ? "Sim" : "Nao"}</span>
            </div>
          </div>
        </div>
      }
      defaultTab="context"
    />
  );
}

function TenantForm({
  draft,
  canEdit,
  onDraftChange,
  onCommitField,
}: {
  draft: AdminTenantFormDraft;
  canEdit: boolean;
  onDraftChange: React.Dispatch<React.SetStateAction<AdminTenantFormDraft>>;
  onCommitField?: <K extends keyof AdminTenantFormDraft>(
    field: K,
    nextValue?: AdminTenantFormDraft[K],
  ) => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <SectionField label="Instituicao">
        <Input
          value={draft.name}
          onChange={(event) =>
            onDraftChange((previous) => ({ ...previous, name: event.target.value }))
          }
          className={lineInputClassName}
          readOnly={!canEdit}
          onBlur={() => onCommitField?.("name")}
        />
      </SectionField>

      <SectionField label="Slug">
        <Input
          value={draft.slug}
          onChange={(event) =>
            onDraftChange((previous) => ({ ...previous, slug: event.target.value }))
          }
          className={lineInputClassName}
          readOnly={!canEdit}
          onBlur={() => onCommitField?.("slug")}
        />
      </SectionField>

      <SectionField label="CNPJ">
        <Input
          value={draft.cnpj}
          onChange={(event) =>
            onDraftChange((previous) => ({ ...previous, cnpj: event.target.value }))
          }
          className={lineInputClassName}
          readOnly={!canEdit}
          onBlur={() => onCommitField?.("cnpj")}
        />
      </SectionField>

      <SectionField label="Ano de inicio">
        <Input
          type="number"
          value={draft.startYear}
          onChange={(event) =>
            onDraftChange((previous) => ({ ...previous, startYear: event.target.value }))
          }
          className={lineInputClassName}
          readOnly={!canEdit}
          onBlur={() => onCommitField?.("startYear")}
        />
      </SectionField>

      <div className="xl:col-span-2 space-y-2">
        <div className={fieldLabelClassName}>Descrição</div>
        <div className="rounded-lg border border-border/60 bg-background/50 p-3">
          <RichText
            value={draft.description}
            onChange={(value) =>
              onDraftChange((previous) => ({ ...previous, description: value }))
            }
            disabled={!canEdit}
            onBlur={() => onCommitField?.("description")}
          />
        </div>
      </div>
    </div>
  );
}

function TenantSide({
  record,
  canAudit,
  detailAudit,
  auditVisibleCount,
  onAuditVisibleCountChange,
}: {
  record: AdminTenantRecord;
  canAudit: boolean;
  detailAudit?: DetailShellAuditContext["detailAudit"];
  auditVisibleCount: number;
  onAuditVisibleCountChange: React.Dispatch<React.SetStateAction<number>>;
}) {
  return (
    <StandardDetailMetadataSide
      mode="edit"
      readOnly
      detailAudit={detailAudit}
      auditVisibleCount={auditVisibleCount}
      onAuditVisibleCountChange={onAuditVisibleCountChange}
      canAudit={canAudit}
      history={{
        items: buildMetadataHistoryItems([
          {
            key: "tenant:created",
            title: "Instituicao registrada",
            description: "Cadastro institucional criado.",
            createdAt: record.createdAt ?? null,
          },
          {
            key: "tenant:updated",
            title: "Instituicao atualizada",
            description: "Dados institucionais alterados.",
            createdAt:
              record.updatedAt && record.updatedAt !== record.createdAt
                ? record.updatedAt
                : null,
          },
        ]),
      }}
      contextPanel={
        <div className="space-y-4">
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Slug</span>
              <span className="font-mono text-foreground">{record.slug || "-"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Status</span>
              <span className="text-foreground">{record.status ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Atualizado</span>
              <span className="text-foreground">{formatDateTimePtBR(record.updatedAt)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Criado</span>
              <span className="text-foreground">{formatDateTimePtBR(record.createdAt)}</span>
            </div>
          </div>
        </div>
      }
      defaultTab={canAudit ? "activity" : "context"}
    />
  );
}

function UserForm({
  draft,
  canEdit,
  onDraftChange,
  isCreate = false,
  onCommitField,
}: {
  draft: AdminUserFormDraft;
  canEdit: boolean;
  onDraftChange: React.Dispatch<React.SetStateAction<AdminUserFormDraft>>;
  isCreate?: boolean;
  onCommitField?: <K extends keyof AdminUserFormDraft>(
    field: K,
    nextValue?: AdminUserFormDraft[K],
  ) => void;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <SectionField label="Nome">
        <Input
          value={draft.name}
          onChange={(event) =>
            onDraftChange((previous) => ({ ...previous, name: event.target.value }))
          }
          className={lineInputClassName}
          readOnly={!canEdit}
          onBlur={() => onCommitField?.("name")}
        />
      </SectionField>

      <SectionField label="Email">
        <Input
          type="email"
          value={draft.email}
          onChange={(event) =>
            onDraftChange((previous) => ({ ...previous, email: event.target.value }))
          }
          className={lineInputClassName}
          readOnly={!canEdit}
          onBlur={() => onCommitField?.("email")}
        />
      </SectionField>

      <SectionField label="Senha">
        <Input
          type="password"
          value={draft.password}
          onChange={(event) =>
            onDraftChange((previous) => ({ ...previous, password: event.target.value }))
          }
          className={lineInputClassName}
          readOnly={!canEdit}
          placeholder={isCreate ? "Obrigatoria no cadastro" : "Preencha apenas para alterar"}
          onBlur={() => onCommitField?.("password")}
        />
      </SectionField>

      <SectionField label="Status">
        <div className="flex h-10 items-center">
          <label className="flex items-center gap-3 text-sm text-foreground">
            <Switch
              checked={draft.isActive}
              onCheckedChange={(next) => {
                onDraftChange((previous) => ({ ...previous, isActive: next }));
                onCommitField?.("isActive", next);
              }}
              disabled={!canEdit}
            />
            <span>{draft.isActive ? "Ativo" : "Inativo"}</span>
          </label>
        </div>
      </SectionField>
    </div>
  );
}

function UserSide({
  user,
  canEdit,
  isCreate,
  canAudit,
  resettingMfa,
  onResetMfa,
  detailAudit,
  auditVisibleCount,
  onAuditVisibleCountChange,
}: {
  user: AdminUserRecord;
  canEdit: boolean;
  isCreate?: boolean;
  canAudit: boolean;
  resettingMfa?: boolean;
  onResetMfa?: () => void;
  detailAudit?: DetailShellAuditContext["detailAudit"];
  auditVisibleCount: number;
  onAuditVisibleCountChange: React.Dispatch<React.SetStateAction<number>>;
}) {
  const avatarSrc = user.avatarUrl ? resolveMediaUrl(user.avatarUrl) : "";
  const initials = getInitials(user.name?.trim() || user.email);

  return (
    <StandardDetailMetadataSide
      mode={isCreate ? "create" : "edit"}
      readOnly={!canEdit}
      detailAudit={detailAudit}
      auditVisibleCount={auditVisibleCount}
      onAuditVisibleCountChange={onAuditVisibleCountChange}
      canAudit={canAudit}
      history={{
        items: buildMetadataHistoryItems([
          {
            key: `user:${user.id}:created`,
            title: "Usuário criado",
            description: user.name?.trim() || user.email,
            createdAt: user.createdAt,
          },
          {
            key: `user:${user.id}:updated`,
            title: "Usuário atualizado",
            description: "Dados cadastrais revisados.",
            createdAt:
              user.updatedAt && user.updatedAt !== user.createdAt
                ? user.updatedAt
                : null,
          },
        ]),
      }}
      contextPanel={
        <div className="space-y-4">
          <div className="flex items-center gap-3 border-b border-border/50 pb-4">
            <Avatar className="size-12 border border-border/60">
              {avatarSrc ? (
                <AvatarImage src={avatarSrc} alt={user.name?.trim() || user.email} />
              ) : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">
                {user.name?.trim() || user.email}
              </div>
              <div className="truncate text-xs text-muted-foreground">{user.email}</div>
            </div>
          </div>
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Status</span>
              <BooleanBadge value={user.isActive} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">MFA</span>
              <span className="text-foreground">{user.mfaTotpEnabled ? "Ativo" : "Inativo"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Telefone</span>
              <span className="text-foreground">{user.phone ?? "-"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Criado</span>
              <span className="text-foreground">{formatDateTimePtBR(user.createdAt)}</span>
            </div>
          </div>
          <div className="space-y-2 border-t border-border/50 pt-4">
            <div className={fieldLabelClassName}>Bio</div>
            <div className="text-sm text-muted-foreground">
              {user.bio?.trim() || "Sem bio cadastrada."}
            </div>
          </div>
          {!isCreate && canEdit && user.mfaTotpEnabled ? (
            <div className="border-t border-border/50 pt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onResetMfa}
                disabled={resettingMfa}
              >
                {resettingMfa ? "Resetando..." : "Resetar MFA"}
              </Button>
            </div>
          ) : null}
        </div>
      }
      defaultTab={canAudit ? "activity" : "context"}
    />
  );
}

export function AdminPermissionMatrix({
  permissionOptions,
  selectedPermissionKeys,
  readOnly,
  onChange,
}: {
  permissionOptions: AdminRolePermissionOption[];
  selectedPermissionKeys: string[];
  readOnly: boolean;
  onChange: (next: string[]) => void;
}) {
  const modules = React.useMemo(() => {
    const grouped = new Map<
      string,
      {
        moduleLabel: string;
        actions: Map<
          string,
          {
            key: string;
            description: string | null | undefined;
          }
        >;
      }
    >();

    permissionOptions.forEach((permission) => {
      const parsed = splitPermissionKey(permission.key);
      const moduleKey = parsed?.moduleKey ?? "outros";
      const action = parsed?.action ?? permission.key;
      const current = grouped.get(moduleKey) ?? {
        moduleLabel: RBAC_MODULE_LABELS[moduleKey] ?? moduleKey,
        actions: new Map(),
      };
      current.actions.set(action, {
        key: permission.key,
        description: repairTextDecoding(permission.description),
      });
      grouped.set(moduleKey, current);
    });

    return Array.from(grouped.entries())
      .map(([moduleKey, group]) => ({
        moduleKey,
        moduleLabel: group.moduleLabel,
        actions: Array.from(group.actions.entries())
          .map(([action, value]) => ({
            action,
            key: value.key,
            description: value.description,
          }))
          .sort((left, right) => {
          const leftIndex = RBAC_ACTION_ORDER.indexOf(left.action as never);
          const rightIndex = RBAC_ACTION_ORDER.indexOf(right.action as never);
          return (leftIndex >= 0 ? leftIndex : 99) - (rightIndex >= 0 ? rightIndex : 99);
          }),
      }))
      .sort((left, right) => left.moduleLabel.localeCompare(right.moduleLabel));
  }, [permissionOptions]);

  const actionColumns = React.useMemo(() => {
    const actions = Array.from(
      new Set(modules.flatMap((module) => module.actions.map((action) => action.action))),
    );
    return actions.sort((left, right) => {
      const leftIndex = RBAC_ACTION_ORDER.indexOf(left as never);
      const rightIndex = RBAC_ACTION_ORDER.indexOf(right as never);
      return (leftIndex >= 0 ? leftIndex : 99) - (rightIndex >= 0 ? rightIndex : 99);
    });
  }, [modules]);

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60 bg-background/50">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border/60 bg-muted/30">
            <th className="w-[240px] px-3 py-2 text-left text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Módulo
            </th>
            {actionColumns.map((action) => (
              <th
                key={action}
                className="min-w-[88px] px-3 py-2 text-center text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
                title={RBAC_ACTION_LABELS[action as keyof typeof RBAC_ACTION_LABELS] ?? action}
              >
                {RBAC_ACTION_LABELS[action as keyof typeof RBAC_ACTION_LABELS] ?? action}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {modules.map((module) => (
            <tr key={module.moduleKey} className="border-b border-border/40 last:border-b-0">
              <td className="px-3 py-3 align-middle">
                <div className="space-y-1">
                  <div className="font-medium text-foreground">
                    {repairTextDecoding(module.moduleLabel) ?? module.moduleLabel}
                  </div>
                  <div className="font-mono text-[11px] text-muted-foreground">{module.moduleKey}</div>
                </div>
              </td>
              {actionColumns.map((action) => {
                const permission = module.actions.find((entry) => entry.action === action);
                const checked = permission ? selectedPermissionKeys.includes(permission.key) : false;
                return (
                  <td key={`${module.moduleKey}:${action}`} className="px-3 py-3 text-center align-middle">
                    {permission ? (
                      <Checkbox
                        checked={checked}
                        title={repairTextDecoding(permission.description?.trim() || permission.key) ?? permission.key}
                        onCheckedChange={(next) => {
                          if (readOnly) return;
                          onChange(
                            next
                              ? [...selectedPermissionKeys, permission.key]
                              : selectedPermissionKeys.filter((entry) => entry !== permission.key),
                          );
                        }}
                        disabled={readOnly}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RoleForm({
  draft,
  canEdit,
  onDraftChange,
  onCommitField,
}: {
  draft: AdminRoleFormDraft;
  canEdit: boolean;
  onDraftChange: React.Dispatch<React.SetStateAction<AdminRoleFormDraft>>;
  onCommitField?: <K extends keyof AdminRoleFormDraft>(
    field: K,
    nextValue?: AdminRoleFormDraft[K],
  ) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <SectionField label="Perfil">
          <Input
            value={draft.name}
            onChange={(event) =>
            onDraftChange((previous) => ({ ...previous, name: event.target.value }))
          }
          className={lineInputClassName}
          readOnly={!canEdit}
          onBlur={() => onCommitField?.("name")}
        />
        </SectionField>

        <SectionField label="Descrição">
          <Textarea
            value={draft.description}
            onChange={(event) =>
            onDraftChange((previous) => ({ ...previous, description: event.target.value }))
          }
          className={lineTextareaClassName}
          readOnly={!canEdit}
          rows={3}
          onBlur={() => onCommitField?.("description")}
        />
        </SectionField>
      </div>

    </div>
  );
}

function RoleSide({
  role,
  permissionKeys,
  canAudit,
  detailAudit,
  auditVisibleCount,
  onAuditVisibleCountChange,
}: {
  role: AdminRoleRecord;
  permissionKeys: string[];
  canAudit: boolean;
  detailAudit?: DetailShellAuditContext["detailAudit"];
  auditVisibleCount: number;
  onAuditVisibleCountChange: React.Dispatch<React.SetStateAction<number>>;
}) {
  const modules = normalizePermissionModules(permissionKeys);

  return (
    <StandardDetailMetadataSide
      mode="edit"
      readOnly
      detailAudit={detailAudit}
      auditVisibleCount={auditVisibleCount}
      onAuditVisibleCountChange={onAuditVisibleCountChange}
      canAudit={canAudit}
      history={{
        items: buildMetadataHistoryItems([
          {
            key: `role:${role.id}:created`,
            title: "Perfil criado",
            description: role.name,
            createdAt: role.createdAt,
          },
          {
            key: `role:${role.id}:updated`,
            title: "Perfil atualizado",
            description: "Configuracao de acesso revisada.",
            createdAt:
              role.updatedAt && role.updatedAt !== role.createdAt
                ? role.updatedAt
                : null,
          },
        ]),
      }}
      contextPanel={
        <div className="space-y-4">
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Permissões</span>
              <span className="text-foreground">{permissionKeys.length}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Módulos</span>
              <span className="text-foreground">{modules.length}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Atualizado</span>
              <span className="text-foreground">{formatDateTimePtBR(role.updatedAt)}</span>
            </div>
          </div>
          <div className="space-y-3 border-t border-border/50 pt-4">
            {modules.length ? (
              modules.map((module) => (
                <div key={module.moduleKey} className="space-y-1">
                  <div className="text-sm font-medium text-foreground">
                    {repairTextDecoding(module.moduleLabel) ?? module.moduleLabel}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {module.actions.map((action) => (
                      <Badge
                        key={`${module.moduleKey}:${action}`}
                        variant="outline"
                        className="rounded-full px-2 text-[10px]"
                      >
                        {RBAC_ACTION_LABELS[action as keyof typeof RBAC_ACTION_LABELS] ??
                          action}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">Nenhum módulo ativo.</div>
            )}
          </div>
        </div>
      }
      defaultTab={canAudit ? "activity" : "context"}
    />
  );
}

function userRoleRelationColumns({
  canEdit,
  onRemoveRoleId,
}: Pick<AdminUserDetailLayoutContext, "canEdit" | "onRemoveRoleId">): ColumnDef<
  AdminUserRoleOption,
  unknown
>[] {
  const columns: ColumnDef<AdminUserRoleOption, unknown>[] = [
    {
      accessorKey: "name",
      header: "Perfil",
      cell: ({ row }) => row.original.name,
    },
    {
      accessorKey: "description",
      header: "Descrição",
      cell: ({ row }) => repairTextDecoding(row.original.description?.trim() || "-") ?? "-",
    },
  ];

  if (canEdit) {
    columns.push({
      id: "actions",
      header: "Ação",
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemoveRoleId?.(row.original.id);
          }}
        >
          Remover
        </Button>
      ),
    });
  }

  return columns;
}

function rolePermissionRelationColumns({
  canEdit,
  onRemovePermissionKey,
}: Pick<
  AdminRoleDetailLayoutContext,
  "canEdit" | "onRemovePermissionKey"
>): ColumnDef<AdminPermissionRecord, unknown>[] {
  const columns: ColumnDef<AdminPermissionRecord, unknown>[] = [
    {
      accessorKey: "moduleLabel",
      header: "Módulo",
      cell: ({ row }) => repairTextDecoding(row.original.moduleLabel) ?? row.original.moduleLabel,
    },
    {
      accessorKey: "action",
      header: "Ação",
      cell: ({ row }) =>
        RBAC_ACTION_LABELS[row.original.action as keyof typeof RBAC_ACTION_LABELS] ??
        row.original.action,
    },
    {
      accessorKey: "key",
      header: "Chave",
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.key}</span>,
    },
    {
      accessorKey: "description",
      header: "Descrição",
      cell: ({ row }) => repairTextDecoding(row.original.description?.trim() || "-") ?? "-",
    },
  ];

  if (canEdit) {
    columns.push({
      id: "actions",
      header: "Ação",
      cell: ({ row }) => (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemovePermissionKey?.(row.original.key);
          }}
        >
          Remover
        </Button>
      ),
    });
  }

  return columns;
}

export type AdminOverviewLayoutContext = DetailShellAuditContext & {
  record: AdminSettingsOverviewRecord;
  canReadInstitution: boolean;
  canReadUsers: boolean;
  canReadRoles: boolean;
  canReadAudit: boolean;
  onOpenInstitution: () => void;
  onOpenUsers: () => void;
  onOpenRoles: () => void;
  onOpenAudit: () => void;
};

export type AdminTenantLayoutContext = DetailShellAuditContext & {
  record: AdminTenantRecord;
  draft: AdminTenantFormDraft;
  canEdit: boolean;
  canAudit: boolean;
  logoUploading?: boolean;
  auditVisibleCount: number;
  onAuditVisibleCountChange: React.Dispatch<React.SetStateAction<number>>;
  onDraftChange: React.Dispatch<React.SetStateAction<AdminTenantFormDraft>>;
  onCommitField?: <K extends keyof AdminTenantFormDraft>(
    field: K,
    nextValue?: AdminTenantFormDraft[K],
  ) => void;
  onLogoFileChange: (file: File | null) => Promise<void> | void;
};

export type AdminUserDetailLayoutContext = DetailShellAuditContext & {
  user: AdminUserRecord;
  draft: AdminUserFormDraft;
  roleOptions: AdminUserRoleOption[];
  selectedRoleOptions: AdminUserRoleOption[];
  canEdit: boolean;
  canAudit: boolean;
  isCreate?: boolean;
  avatarUploading?: boolean;
  resettingMfa?: boolean;
  auditVisibleCount: number;
  onAuditVisibleCountChange: React.Dispatch<React.SetStateAction<number>>;
  onDraftChange: React.Dispatch<React.SetStateAction<AdminUserFormDraft>>;
  onResetMfa?: () => void;
  onAvatarFileSelect?: (file: File) => Promise<void> | void;
  onOpenRolePicker?: () => void;
  onRemoveRoleId?: (roleId: string) => void;
  onOpenRoleDetail?: (roleId: string) => void;
  onCommitField?: <K extends keyof AdminUserFormDraft>(
    field: K,
    nextValue?: AdminUserFormDraft[K],
  ) => void;
  onCommitDraft?: (nextDraft: AdminUserFormDraft) => void;
};

export type AdminRoleDetailLayoutContext = DetailShellAuditContext & {
  role: AdminRoleRecord;
  draft: AdminRoleFormDraft;
  permissionOptions: AdminRolePermissionOption[];
  selectedPermissionRecords: AdminPermissionRecord[];
  canEdit: boolean;
  canAudit: boolean;
  isCreate?: boolean;
  auditVisibleCount: number;
  onAuditVisibleCountChange: React.Dispatch<React.SetStateAction<number>>;
  onDraftChange: React.Dispatch<React.SetStateAction<AdminRoleFormDraft>>;
  onOpenPermissionPicker?: () => void;
  onRemovePermissionKey?: (permissionKey: string) => void;
  onCommitField?: <K extends keyof AdminRoleFormDraft>(
    field: K,
    nextValue?: AdminRoleFormDraft[K],
  ) => void;
  onCommitDraft?: (nextDraft: AdminRoleFormDraft) => void;
};

export type AdminAuditDetailLayoutContext = {
  record: AdminAuditRecord;
};

function summarizeAuditValue(value: unknown) {
  if (value === null || typeof value === "undefined") return "—";
  if (Array.isArray(value)) return value.length ? value.map((entry) => String(entry ?? "")).join(", ") : "—";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function buildAuditChangeRows(record: AdminAuditRecord) {
  const before = record.before && typeof record.before === "object" ? (record.before as Record<string, unknown>) : {};
  const after = record.after && typeof record.after === "object" ? (record.after as Record<string, unknown>) : {};
  const fieldNames = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));

  return fieldNames
    .map((field) => ({
      field,
      before: summarizeAuditValue(before[field]),
      after: summarizeAuditValue(after[field]),
    }))
    .filter((entry) => entry.before !== entry.after);
}

function AuditDetailMain({ record }: AdminAuditDetailLayoutContext) {
  const changeRows = React.useMemo(() => buildAuditChangeRows(record), [record]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <SectionField label="Entidade">
          <div className={summaryValueClassName}>{record.entity}</div>
        </SectionField>
        <SectionField label="Ação">
          <div className={summaryValueClassName}>{record.action}</div>
        </SectionField>
        <SectionField label="ID da entidade">
          <div className="font-mono text-sm text-foreground">{record.entityId || "-"}</div>
        </SectionField>
        <SectionField label="Data">
          <div className={summaryValueClassName}>{formatDateTimePtBR(record.createdAt)}</div>
        </SectionField>
        <SectionField label="Usuário">
          <div className={summaryValueClassName}>{record.userName || "Sistema"}</div>
        </SectionField>
        <SectionField label="Email">
          <div className={summaryValueClassName}>{record.userEmail || "-"}</div>
        </SectionField>
      </div>

      <section className="space-y-3">
        <ModuleSectionHeader title="Alterações" meta={changeRows.length} />
        {changeRows.length ? (
          <div className="overflow-x-auto rounded-lg border border-border/60 bg-background/50">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="px-3 py-2 text-left text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Campo</th>
                  <th className="px-3 py-2 text-left text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Antes</th>
                  <th className="px-3 py-2 text-left text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Depois</th>
                </tr>
              </thead>
              <tbody>
                {changeRows.map((entry) => (
                  <tr key={entry.field} className="border-b border-border/40 last:border-b-0">
                    <td className="px-3 py-3 font-medium text-foreground">{entry.field}</td>
                    <td className="px-3 py-3 whitespace-pre-wrap text-muted-foreground">{entry.before}</td>
                    <td className="px-3 py-3 whitespace-pre-wrap text-foreground">{entry.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ModuleEmptyState
            title="Sem diff detalhado"
            description="Este registro não possui campos comparáveis no before/after."
            compact
          />
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionField label="Before">
          <pre className="min-h-[180px] overflow-auto rounded-none border border-border/60 bg-background/50 p-3 text-xs text-muted-foreground">
            {JSON.stringify(record.before ?? null, null, 2)}
          </pre>
        </SectionField>
        <SectionField label="After">
          <pre className="min-h-[180px] overflow-auto rounded-none border border-border/60 bg-background/50 p-3 text-xs text-muted-foreground">
            {JSON.stringify(record.after ?? null, null, 2)}
          </pre>
        </SectionField>
      </div>
    </div>
  );
}

function AuditDetailSide({ record }: AdminAuditDetailLayoutContext) {
  return (
    <StandardDetailMetadataSide
      mode="edit"
      readOnly
      history={{
        items: buildMetadataHistoryItems([
          {
            key: `audit:${record.id}:created`,
            title: "Evento de auditoria registrado",
            description: `${record.entity} ${record.action}`,
            meta: record.userName || "Sistema",
            createdAt: record.createdAt,
          },
        ]),
      }}
      contextItems={[
        { key: "entityId", label: "ID da entidade", value: record.entityId || "-" },
        { key: "user", label: "Usuário", value: record.userName || "Sistema" },
        { key: "email", label: "Email", value: record.userEmail || "-" },
        { key: "requestId", label: "Request ID", value: record.requestId || "-" },
        { key: "ipAddress", label: "IP", value: record.ipAddress || "-" },
      ]}
      defaultTab="context"
    />
  );
}

export const adminOverviewLayout: DetailLayoutConfig<AdminOverviewLayoutContext> = {
  header: {
    title: ({ record }) => record.name,
    slot: ({ record }) => (
      <div className="border-y border-border/60 bg-transparent px-0 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">Status</div>
            <div className="font-medium text-foreground">{record.status ?? "-"}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">Usuários</div>
            <div className="font-medium text-foreground">{record.usersTotal}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">Perfis</div>
            <div className="font-medium text-foreground">{record.rolesTotal}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">Permissões</div>
            <div className="font-medium text-foreground">{record.permissionsTotal}</div>
          </div>
        </div>
      </div>
    ),
  },
  main: (context) => <OverviewMain {...context} />,
  side: (context) => <OverviewSide {...context} />,
};

export const adminTenantDetailLayout: DetailLayoutConfig<AdminTenantLayoutContext> = {
  editing: AUTO_EDITING,
  header: {
    title: ({ record }) => record.name,
    leadingSlot: ({ draft, canEdit, logoUploading, onLogoFileChange }) => (
      <DetailIdentityMediaField
        variant="header"
        name={draft.name || "Instituicao"}
        value={draft.logoFile ?? draft.logoUrl ?? null}
        shape="rounded"
        readOnly={!canEdit}
        busy={logoUploading}
        onFileSelect={onLogoFileChange ? (file) => onLogoFileChange(file) : undefined}
      />
    ),
    slot: ({ record }) => (
      <div className="border-y border-border/60 bg-transparent px-0 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">Status</div>
            <div className="font-medium text-foreground">
              {record.status === "ACTIVE" ? "Ativo" : record.status === "INACTIVE" ? "Inativo" : record.status ?? "-"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">Slug</div>
            <div className="font-mono text-foreground">{record.slug ?? "-"}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">Atualizado</div>
            <div className="font-medium text-foreground">{formatDateOnlyPtBR(record.updatedAt)}</div>
          </div>
        </div>
      </div>
    ),
  },
  main: ({ draft, canEdit, onDraftChange, onCommitField }) => (
    <TenantForm
      draft={draft}
      canEdit={canEdit}
      onDraftChange={onDraftChange}
      onCommitField={onCommitField}
    />
  ),
  side: ({
    record,
    canAudit,
    detailAudit,
    auditVisibleCount,
    onAuditVisibleCountChange,
  }) => (
    <TenantSide
      record={record}
      canAudit={canAudit}
      detailAudit={detailAudit}
      auditVisibleCount={auditVisibleCount}
      onAuditVisibleCountChange={onAuditVisibleCountChange}
    />
  ),
  auditSources: {
    primaryEntity: {
      key: "tenant",
      entity: "Tenant",
      model: "audit.logs",
      label: "Instituicao",
      fieldLabels: {
        name: "Instituicao",
        slug: "Slug",
        logoUrl: "Logo",
        cnpj: "CNPJ",
        startYear: "Ano de inicio",
        description: "Descrição",
        status: "Status",
      },
      resolveEntityId: ({ record }) => record.id,
      valueFormatters: {
        logoUrl: (value) => (value ? "Logo definida" : "Sem logo"),
      },
    },
    sort: [{ field: "createdAt", direction: "desc" }],
    pagination: { limit: 120 },
  },
};

export const adminUserDetailLayout: DetailLayoutConfig<AdminUserDetailLayoutContext> = {
  editing: AUTO_EDITING,
  header: {
    title: ({ user }) => user.name?.trim() || user.email,
    leadingSlot: ({ draft, canEdit, avatarUploading, onAvatarFileSelect }) => (
      <DetailIdentityMediaField
        variant="header"
        name={draft.name || draft.email || "Usuário"}
        value={draft.avatarUrl}
        readOnly={!canEdit}
        busy={avatarUploading}
        onFileSelect={onAvatarFileSelect}
      />
    ),
    slot: ({ user, selectedRoleOptions }) => (
      <div className="border-y border-border/60 bg-transparent px-0 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">Status</div>
            <BooleanBadge value={user.isActive} />
          </div>
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">Perfis</div>
            <div className="font-medium text-foreground">{selectedRoleOptions.length}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">MFA</div>
            <div className="font-medium text-foreground">{user.mfaTotpEnabled ? "Ativo" : "Inativo"}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">Criado</div>
            <div className="font-medium text-foreground">{formatDateOnlyPtBR(user.createdAt)}</div>
          </div>
        </div>
      </div>
    ),
  },
  main: ({
    draft,
    canEdit,
    onDraftChange,
    isCreate,
    onCommitField,
  }) => (
    <UserForm
      draft={draft}
      canEdit={canEdit}
      onDraftChange={onDraftChange}
      isCreate={isCreate}
      onCommitField={onCommitField}
    />
  ),
  side: ({
    user,
    canEdit,
    isCreate,
    canAudit,
    resettingMfa,
    onResetMfa,
    detailAudit,
    auditVisibleCount,
    onAuditVisibleCountChange,
  }) => (
    <UserSide
      user={user}
      canEdit={canEdit}
      isCreate={isCreate}
      canAudit={canAudit}
      resettingMfa={resettingMfa}
      onResetMfa={onResetMfa}
      detailAudit={detailAudit}
      auditVisibleCount={auditVisibleCount}
      onAuditVisibleCountChange={onAuditVisibleCountChange}
    />
  ),
  tabTemplates: [
    {
      key: "roles",
      label: "Perfis",
      badge: ({ selectedRoleOptions }) => selectedRoleOptions.length,
      relations: [
        {
          key: "user-roles",
          label: "Perfis vinculados",
          rows: ({ selectedRoleOptions }) => selectedRoleOptions,
          columns: ({ canEdit, onRemoveRoleId }) =>
            userRoleRelationColumns({ canEdit, onRemoveRoleId }),
          getRowId: (row) => row.id,
          onRowClick: (row, { onOpenRoleDetail }) => onOpenRoleDetail?.(row.id),
          emptyLabel: "Nenhum perfil vinculado a este usuário.",
          action: {
            label: "Vincular perfil",
            onClick: ({ onOpenRolePicker }) => onOpenRolePicker?.(),
            hidden: ({ canEdit }) => !canEdit,
          },
        },
      ],
    },
  ],
  auditSources: {
    primaryEntity: {
      key: "user",
      entity: "User",
      model: "audit.logs",
      label: "Usuário",
      fieldLabels: {
        name: "Nome",
        email: "Email",
        phone: "Telefone",
        bio: "Bio",
        avatarUrl: "Foto",
        isActive: "Status",
        mfaTotpEnabled: "MFA",
      },
      resolveEntityId: ({ user }) => user.id,
      valueFormatters: {
        isActive: (value) => (value ? "Ativo" : "Inativo"),
        mfaTotpEnabled: (value) => (value ? "Ativo" : "Inativo"),
        avatarUrl: (value) => (value ? "Foto definida" : "Sem foto"),
      },
    },
    sort: [{ field: "createdAt", direction: "desc" }],
    pagination: { limit: 120 },
  },
};

export const adminRoleDetailLayout: DetailLayoutConfig<AdminRoleDetailLayoutContext> = {
  editing: AUTO_EDITING,
  header: {
    title: ({ role }) => role.name,
    slot: ({ selectedPermissionRecords }) => (
      <div className="border-y border-border/60 bg-transparent px-0 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">Permissões</div>
            <div className="font-medium text-foreground">{selectedPermissionRecords.length}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">Módulos</div>
            <div className="font-medium text-foreground">
              {normalizePermissionModules(selectedPermissionRecords.map((entry) => entry.key)).length}
            </div>
          </div>
        </div>
      </div>
    ),
  },
  main: ({
    draft,
    canEdit,
    onDraftChange,
    onCommitField,
  }) => (
    <RoleForm
      draft={draft}
      canEdit={canEdit}
      onDraftChange={onDraftChange}
      onCommitField={onCommitField}
    />
  ),
  side: ({
    role,
    draft,
    canAudit,
    detailAudit,
    auditVisibleCount,
    onAuditVisibleCountChange,
  }) => (
    <RoleSide
      role={role}
      permissionKeys={draft.permissionKeys}
      canAudit={canAudit}
      detailAudit={detailAudit}
      auditVisibleCount={auditVisibleCount}
      onAuditVisibleCountChange={onAuditVisibleCountChange}
    />
  ),
  tabTemplates: [
    {
      key: "permissions",
      label: "Permissões",
      badge: ({ selectedPermissionRecords }) => selectedPermissionRecords.length,
      relations: [
        {
          key: "role-permissions",
          label: "Permissões",
          rows: ({ selectedPermissionRecords }) => selectedPermissionRecords,
          columns: ({ canEdit, onRemovePermissionKey }) =>
            rolePermissionRelationColumns({ canEdit, onRemovePermissionKey }),
          getRowId: (row) => row.id,
          searchable: true,
          emptyLabel: "Nenhuma permissão vinculada.",
          action: {
            label: "Vincular permissão",
            onClick: ({ onOpenPermissionPicker }) => onOpenPermissionPicker?.(),
            hidden: ({ canEdit }) => !canEdit,
          },
        },
      ],
    },
  ],
  auditSources: {
    primaryEntity: {
      key: "role",
      entity: "Role",
      model: "audit.logs",
      label: "Perfil",
      fieldLabels: {
        name: "Perfil",
        description: "Descrição",
      },
      resolveEntityId: ({ role }) => role.id,
    },
    sort: [{ field: "createdAt", direction: "desc" }],
    pagination: { limit: 120 },
  },
};

export const adminAuditDetailLayout: DetailLayoutConfig<AdminAuditDetailLayoutContext> = {
  header: {
    title: ({ record }) => `${record.entity} / ${record.action}`,
    slot: ({ record }) => (
      <div className="border-y border-border/60 bg-transparent px-0 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">Usuário</div>
            <div className="font-medium text-foreground">{record.userName || "Sistema"}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">Entidade</div>
            <div className="font-medium text-foreground">{record.entity}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">Ação</div>
            <div className="font-medium text-foreground">{record.action}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-muted-foreground">Data</div>
            <div className="font-medium text-foreground">{formatDateTimePtBR(record.createdAt)}</div>
          </div>
        </div>
      </div>
    ),
  },
  main: (context) => <AuditDetailMain {...context} />,
  side: (context) => <AuditDetailSide {...context} />,
};
