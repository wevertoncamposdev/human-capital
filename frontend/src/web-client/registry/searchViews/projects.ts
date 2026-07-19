"use client";

import { PROJECT_STATUS_OPTIONS } from "@/modules/projects/shared/domain/projects.constants";
import type { SearchViewDefinition } from "@/web-client/search/types";

export const projectsSearchView: SearchViewDefinition = {
  id: "projects.search",
  model: "projects.list",
  searchPlaceholder: "Pesquisar",
  features: {
    favorites: true,
    presets: true,
    advancedFilters: true,
    groupBy: true,
    clearAll: true,
  },
  fields: [
    {
      name: "status",
      label: "Status",
      type: "select",
      operators: ["="],
      options: PROJECT_STATUS_OPTIONS,
    },
    {
      name: "tags",
      label: "Tags",
      type: "multi-select",
      operators: ["in", "contains", "is_null", "not_null"],
    },
    {
      name: "createdAt",
      label: "Cadastro",
      type: "date",
      operators: ["between", ">=", "<=", "="],
    },
  ],
  groupBy: [
    { field: "status", label: "Status" },
    { field: "tags", label: "Tags" },
    { field: "createdAt", label: "Cadastro" },
    { field: "program.name", label: "Programa" },
    { field: "program.type", label: "Tipo do programa" },
  ],
  presets: [
    {
      id: "active",
      label: "Ativos",
      domain: { type: "condition", field: "status", operator: "=", value: "ACTIVE" },
    },
  ],
};

export const projectsDetailSearchView: SearchViewDefinition = {
  id: "projects.detail.search",
  model: "projects.detail",
  searchPlaceholder: "",
  features: {
    favorites: false,
    presets: false,
    advancedFilters: false,
    groupBy: false,
    clearAll: false,
  },
  fields: [
    {
      name: "status",
      label: "Status",
      type: "select",
      operators: ["="],
      options: PROJECT_STATUS_OPTIONS,
    },
  ],
};
