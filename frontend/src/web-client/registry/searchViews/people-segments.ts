"use client";

import type { SearchViewDefinition } from "@/web-client/search/types";

export const peopleSegmentsSearchView: SearchViewDefinition = {
  id: "people-segments.search",
  model: "people-segments.list",
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
      name: "purpose",
      label: "Finalidade",
      type: "select",
      operators: ["="],
      options: [
        { value: "PUBLICO", label: "Publico" },
        { value: "EQUIPE", label: "Equipe" },
      ],
    },
    {
      name: "category",
      label: "Categoria",
      type: "text",
      operators: ["contains", "="],
    },
    {
      name: "createdAt",
      label: "Cadastro",
      type: "date",
      operators: ["between", ">=", "<=", "="],
    },
    {
      name: "isActive",
      label: "Status",
      type: "boolean",
      operators: ["="],
    },
  ],
  groupBy: [
    { field: "purpose", label: "Finalidade" },
    { field: "category", label: "Categoria" },
    { field: "createdAt", label: "Cadastro" },
    { field: "isActive", label: "Status" },
  ],
  presets: [
    {
      id: "active",
      label: "Ativos",
      domain: { type: "condition", field: "isActive", operator: "=", value: true },
    },
  ],
};

export const peopleSegmentsDetailSearchView: SearchViewDefinition = {
  id: "people-segments.detail.search",
  model: "people-segments.detail",
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
      name: "isActive",
      label: "Status",
      type: "boolean",
      operators: ["="],
    },
  ],
};
