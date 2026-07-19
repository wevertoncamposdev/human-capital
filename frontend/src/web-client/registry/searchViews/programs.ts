"use client";

import {
  PROGRAM_STATUS_OPTIONS,
  PROGRAM_TYPE_OPTIONS,
} from "@/modules/programs/shared/domain/programs.constants";
import type { SearchViewDefinition } from "@/web-client/search/types";

export const programsSearchView: SearchViewDefinition = {
  id: "programs.search",
  model: "programs.list",
  searchPlaceholder: "Pesquisar programas em qualquer coluna visivel da tabela",
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
      options: PROGRAM_STATUS_OPTIONS,
    },
    {
      name: "type",
      label: "Tipo",
      type: "select",
      operators: ["="],
      options: PROGRAM_TYPE_OPTIONS,
    },
    {
      name: "tags",
      label: "Tags",
      type: "text",
      operators: ["contains", "=", "!="],
    },
    {
      name: "createdAt",
      label: "Cadastro",
      type: "date",
      operators: ["=", ">=", "<="],
    },
  ],
  groupBy: [
    { field: "status", label: "Status" },
    { field: "type", label: "Tipo" },
    { field: "tags", label: "Tags" },
    { field: "createdAt", label: "Cadastro" },
  ],
  presets: [
    {
      id: "active",
      label: "Ativos",
      domain: { type: "condition", field: "status", operator: "=", value: "ACTIVE" },
    },
    {
      id: "planned",
      label: "Planejados",
      domain: { type: "condition", field: "status", operator: "=", value: "PLANNED" },
    },
  ],
};

export const programsDetailSearchView: SearchViewDefinition = {
  id: "programs.detail.search",
  model: "programs.detail",
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
      options: PROGRAM_STATUS_OPTIONS,
    },
    {
      name: "type",
      label: "Tipo",
      type: "select",
      operators: ["="],
      options: PROGRAM_TYPE_OPTIONS,
    },
  ],
};
