"use client";

import {
  ADMIN_AUDIT_ACTION_OPTIONS,
  ADMIN_USER_STATUS_OPTIONS,
} from "@/modules/core/admin/admin.constants";
import { RBAC_ACTION_LABELS, RBAC_ACTION_ORDER, RBAC_MODULE_LABELS } from "@/features/admin/config/rbac.constants";
import type { SearchViewDefinition } from "@/web-client/search/types";

const permissionModuleOptions = Object.entries(RBAC_MODULE_LABELS)
  .map(([value, label]) => ({ value, label }))
  .sort((left, right) => left.label.localeCompare(right.label));

const permissionActionOptions = RBAC_ACTION_ORDER.map((value) => ({
  value,
  label: RBAC_ACTION_LABELS[value],
}));

export const adminSingletonSearchView: SearchViewDefinition = {
  id: "admin.singleton.search",
  model: "admin.singleton",
  searchPlaceholder: "",
  features: {
    favorites: false,
    presets: false,
    advancedFilters: false,
    groupBy: false,
    clearAll: false,
  },
  fields: [],
};

export const adminUsersSearchView: SearchViewDefinition = {
  id: "admin.users.search",
  model: "admin.users",
  searchPlaceholder: "Pesquisar usuarios por nome, email ou perfil",
  features: {
    favorites: true,
    presets: true,
    advancedFilters: true,
    groupBy: true,
    clearAll: true,
  },
  fields: [
    { name: "name", label: "Nome", type: "text", operators: ["ilike", "contains", "="] },
    { name: "email", label: "Email", type: "text", operators: ["ilike", "contains", "="] },
    { name: "phone", label: "Telefone", type: "text", operators: ["ilike", "contains", "="] },
    { name: "bio", label: "Bio", type: "text", operators: ["ilike", "contains", "="] },
    {
      name: "isActive",
      label: "Status",
      type: "boolean",
      operators: ["="],
      options: [...ADMIN_USER_STATUS_OPTIONS],
    },
    { name: "roleNames", label: "Perfis", type: "multi-select", operators: ["in", "contains"] },
    { name: "createdAt", label: "Criado em", type: "date", operators: ["between", ">=", "<=", "="] },
    { name: "updatedAt", label: "Atualizado em", type: "date", operators: ["between", ">=", "<=", "="] },
  ],
  groupBy: [
    { field: "isActive", label: "Status" },
    { field: "roleNames", label: "Perfis" },
  ],
  presets: [
    {
      id: "active",
      label: "Ativos",
      domain: { type: "condition", field: "isActive", operator: "=", value: true },
    },
    {
      id: "inactive",
      label: "Inativos",
      domain: { type: "condition", field: "isActive", operator: "=", value: false },
    },
  ],
};

export const adminRolesSearchView: SearchViewDefinition = {
  id: "admin.roles.search",
  model: "admin.roles",
  searchPlaceholder: "Pesquisar perfis por nome, descricao ou modulo",
  features: {
    favorites: true,
    presets: true,
    advancedFilters: true,
    groupBy: true,
    clearAll: true,
  },
  fields: [
    { name: "name", label: "Perfil", type: "text", operators: ["ilike", "contains", "="] },
    { name: "description", label: "Descricao", type: "text", operators: ["ilike", "contains", "="] },
    { name: "modules", label: "Modulos", type: "multi-select", operators: ["in", "contains"] },
    { name: "permissionKeys", label: "Permissoes", type: "multi-select", operators: ["in", "contains"] },
    { name: "permissionCount", label: "Qtd. permissoes", type: "number", operators: [">=", "<=", "="] },
    { name: "moduleCount", label: "Qtd. modulos", type: "number", operators: [">=", "<=", "="] },
    { name: "createdAt", label: "Criado em", type: "date", operators: ["between", ">=", "<=", "="] },
  ],
  groupBy: [
    { field: "modules", label: "Modulos" },
    { field: "moduleCount", label: "Qtd. modulos" },
  ],
};

export const adminPermissionsSearchView: SearchViewDefinition = {
  id: "admin.permissions.search",
  model: "admin.permissions",
  searchPlaceholder: "Pesquisar permissoes por chave, modulo ou acao",
  features: {
    favorites: true,
    presets: false,
    advancedFilters: true,
    groupBy: true,
    clearAll: true,
  },
  fields: [
    { name: "key", label: "Chave", type: "text", operators: ["ilike", "contains", "="] },
    { name: "description", label: "Descricao", type: "text", operators: ["ilike", "contains", "="] },
    {
      name: "moduleKey",
      label: "Modulo",
      type: "select",
      operators: ["="],
      options: permissionModuleOptions,
    },
    {
      name: "action",
      label: "Acao",
      type: "select",
      operators: ["="],
      options: permissionActionOptions,
    },
  ],
  groupBy: [
    { field: "moduleKey", label: "Modulo" },
    { field: "action", label: "Acao" },
  ],
};

export const adminAuditSearchView: SearchViewDefinition = {
  id: "admin.audit.search",
  model: "admin.audit",
  searchPlaceholder: "Pesquisar auditoria por usuario, entidade ou acao",
  features: {
    favorites: true,
    presets: true,
    advancedFilters: true,
    groupBy: true,
    clearAll: true,
  },
  fields: [
    { name: "entity", label: "Entidade", type: "text", operators: ["ilike", "contains", "="] },
    { name: "entityId", label: "ID da entidade", type: "text", operators: ["contains", "="] },
    {
      name: "action",
      label: "Acao",
      type: "select",
      operators: ["="],
      options: [...ADMIN_AUDIT_ACTION_OPTIONS],
    },
    { name: "userName", label: "Usuario", type: "text", operators: ["ilike", "contains", "="] },
    { name: "userEmail", label: "Email do usuario", type: "text", operators: ["ilike", "contains", "="] },
    { name: "createdAt", label: "Data", type: "date", operators: ["between", ">=", "<=", "="] },
  ],
  groupBy: [
    { field: "action", label: "Acao" },
    { field: "entity", label: "Entidade" },
    { field: "userName", label: "Usuario" },
  ],
  presets: [
    {
      id: "updates",
      label: "Atualizacoes",
      domain: { type: "condition", field: "action", operator: "=", value: "UPDATE" },
    },
    {
      id: "deletions",
      label: "Exclusoes",
      domain: { type: "condition", field: "action", operator: "=", value: "DELETE" },
    },
  ],
};
