"use client";

import { ACTION_STATUS_OPTIONS } from "@/modules/actions/shared/domain/actions.constants";
import type { SearchViewDefinition } from "@/web-client/search/types";

export const actionsSearchView: SearchViewDefinition = {
  id: "actions.search",
  model: "actions.list",
  searchPlaceholder: "Pesquisar acoes por titulo ou tipo",
  features: {
    favorites: true,
    presets: false,
    advancedFilters: true,
    groupBy: true,
    clearAll: true,
  },
  fields: [
    {
      name: "project.name",
      label: "Projeto",
      type: "text",
      operators: ["contains", "=", "!="],
    },
    {
      name: "actionType.name",
      label: "Tipo",
      type: "text",
      operators: ["contains", "=", "!="],
    },
    {
      name: "projectGroup.name",
      label: "Grupo de Participantes",
      type: "text",
      operators: ["contains", "=", "!="],
    },
    {
      name: "peopleGroup.name",
      label: "Grupo de Pessoas",
      type: "text",
      operators: ["contains", "=", "!="],
    },
    {
      name: "targetEnrollment.person.fullName",
      label: "Participante",
      type: "text",
      operators: ["contains", "=", "!="],
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      operators: ["="],
      options: ACTION_STATUS_OPTIONS,
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
    { field: "project.name", label: "Projeto" },
    { field: "status", label: "Status" },
    { field: "tags", label: "Tags" },
    { field: "createdAt", label: "Cadastro" },
    { field: "actionType.name", label: "Tipo" },
    { field: "projectGroup.name", label: "Grupo de Participantes" },
    { field: "peopleGroup.name", label: "Grupo de Pessoas" },
    { field: "targetEnrollment.person.fullName", label: "Participante" },
  ],
};

export const actionsDetailSearchView: SearchViewDefinition = {
  id: "actions.detail.search",
  model: "actions.detail",
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
      options: ACTION_STATUS_OPTIONS,
    },
  ],
};
