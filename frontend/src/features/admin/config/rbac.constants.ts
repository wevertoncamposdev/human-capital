"use client";

export const RBAC_ACTION_ORDER = ["read", "create", "update", "delete", "manage"] as const;

export type RbacAction = (typeof RBAC_ACTION_ORDER)[number];

export const RBAC_ACTION_LABELS: Record<RbacAction, string> = {
  read: "Visualizar",
  create: "Criar",
  update: "Editar",
  delete: "Remover",
  manage: "Gerenciar",
};

export const RBAC_MODULE_LABELS: Record<string, string> = {
  programs: "Programas",
  projects: "Projetos",
  "project-structure": "Projetos / Estrutura",
  enrollments: "Projetos / Matrículas",
  actions: "Ações",
  people: "Pessoas",
  "people.identity": "Pessoas / Sinalizações",
  "people.sensitive": "Pessoas / Dados sensíveis (LGPD)",
  pantry: "Despensa",
  financial: "Financeiro",
  users: "Usuários",
  tenants: "Instituição",
  audit: "Auditoria",
  roles: "Perfis",
  permissions: "Permissões",
};

export const RBAC_MODULE_ACTIONS: Record<string, { label: string; actions: string[] }> = {
  programs: { label: RBAC_MODULE_LABELS.programs, actions: ["read", "create", "update", "delete"] },
  projects: { label: RBAC_MODULE_LABELS.projects, actions: ["read", "create", "update", "delete"] },
  "project-structure": {
    label: RBAC_MODULE_LABELS["project-structure"],
    actions: ["read", "create", "update", "delete"],
  },
  enrollments: {
    label: RBAC_MODULE_LABELS.enrollments,
    actions: ["read", "create", "update", "delete"],
  },
  actions: {
    label: RBAC_MODULE_LABELS.actions,
    actions: ["read", "create", "update", "delete", "manage"],
  },
  people: { label: RBAC_MODULE_LABELS.people, actions: ["read", "create", "update", "delete"] },
  "people.identity": { label: RBAC_MODULE_LABELS["people.identity"], actions: ["read"] },
  "people.sensitive": {
    label: RBAC_MODULE_LABELS["people.sensitive"],
    actions: ["read", "update"],
  },
  pantry: { label: RBAC_MODULE_LABELS.pantry, actions: ["read", "create", "update", "delete"] },
  financial: {
    label: RBAC_MODULE_LABELS.financial,
    actions: ["read", "create", "update", "delete"],
  },
  users: { label: RBAC_MODULE_LABELS.users, actions: ["read", "create", "update", "delete"] },
  tenants: { label: RBAC_MODULE_LABELS.tenants, actions: ["read", "update"] },
  audit: { label: RBAC_MODULE_LABELS.audit, actions: ["read"] },
  roles: { label: RBAC_MODULE_LABELS.roles, actions: ["manage"] },
};

export function splitPermissionKey(permissionKey: string): {
  moduleKey: string;
  action: string;
} | null {
  const parts = permissionKey.split(".");
  if (parts.length < 2) return null;
  const action = parts[parts.length - 1] ?? "";
  const moduleKey = parts.slice(0, -1).join(".");
  if (!moduleKey || !action) return null;
  return { moduleKey, action };
}
