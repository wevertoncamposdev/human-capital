"use client";

export const ADMIN_ROUTES = {
  overview: "/settings",
  institution: "/admin/tenant",
  users: "/admin/users",
  usersNew: "/admin/users/new",
  roles: "/admin/roles",
  rolesNew: "/admin/roles/new",
  permissions: "/admin/permissions",
  audit: "/admin/audit-logs",
  auditDetail: "/admin/audit-logs",
} as const;

export const ADMIN_ACTION_IDS = {
  overview: "admin.settings.overview",
  institution: "admin.tenant.detail",
  usersList: "admin.users.list",
  usersDetail: "admin.users.detail",
  usersCreate: "admin.users.create",
  rolesList: "admin.roles.list",
  rolesDetail: "admin.roles.detail",
  rolesCreate: "admin.roles.create",
  permissionsList: "admin.permissions.list",
  auditList: "admin.audit.list",
  auditDetail: "admin.audit.detail",
} as const;

export const ADMIN_USER_STATUS_OPTIONS = [
  { value: "true", label: "Ativo" },
  { value: "false", label: "Inativo" },
] as const;

export const ADMIN_AUDIT_ACTION_OPTIONS = [
  { value: "CREATE", label: "Criado" },
  { value: "UPDATE", label: "Atualizado" },
  { value: "DELETE", label: "Excluído" },
] as const;

export const ADMIN_USAGE_TEXT = {
  users: {
    title: "Administração / Usuários",
    sections: [
      {
        title: "Dados principais",
        items: [
          "Edite nome, e-mail, status e foto no detalhe.",
          "Use Excluir para remover o usuário quando permitido.",
        ],
      },
      {
        title: "Perfis",
        items: [
          "Use a aba Perfis para vincular ou remover perfis.",
          "Clique em um perfil vinculado para abrir o detalhe relacionado.",
        ],
      },
      {
        title: "Painel lateral",
        items: [
          "Auditoria mostra alterações do registro.",
          "Histórico e contexto apoiam consulta rápida do usuário.",
        ],
      },
    ],
  },
  roles: {
    title: "Administração / Perfis",
    sections: [
      {
        title: "Dados principais",
        items: [
          "Edite nome e descrição diretamente no detalhe.",
          "Use Excluir para remover o perfil quando permitido.",
        ],
      },
      {
        title: "Permissões",
        items: [
          "Use a aba Permissões para vincular ou remover permissões.",
          "Os vínculos são atualizados no próprio relation manager.",
        ],
      },
      {
        title: "Painel lateral",
        items: [
          "Auditoria mostra alterações do perfil.",
          "Histórico e contexto resumem módulos e volume de acesso.",
        ],
      },
    ],
  },
} as const;
