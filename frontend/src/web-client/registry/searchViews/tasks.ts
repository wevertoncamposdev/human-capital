"use client";

import {
  TASK_KIND_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
} from "@/modules/tasks/shared/domain/tasks.constants";
import type { SearchViewDefinition } from "@/web-client/search/types";

export const tasksSearchView: SearchViewDefinition = {
  id: "tasks.search",
  model: "tasks.list",
  searchPlaceholder: "Pesquisar tarefas por titulo, responsavel, tag ou resumo",
  features: {
    favorites: true,
    presets: true,
    advancedFilters: true,
    groupBy: true,
    clearAll: true,
  },
  presets: [
    {
      id: "in-progress",
      label: "Em andamento",
      domain: {
        type: "condition",
        field: "status",
        operator: "=",
        value: "Em andamento",
      },
    },
    {
      id: "critical",
      label: "Criticas",
      domain: {
        type: "condition",
        field: "priority",
        operator: "=",
        value: "Critica",
      },
    },
    {
      id: "overdue",
      label: "Atrasadas",
      domain: {
        type: "condition",
        field: "dueState",
        operator: "=",
        value: "Atrasada",
      },
    },
    {
      id: "due-today",
      label: "Vencem hoje",
      domain: {
        type: "condition",
        field: "dueState",
        operator: "=",
        value: "Hoje",
      },
    },
  ],
  filterCombinators: ["and"],
  fields: [
    {
      name: "title",
      label: "Titulo",
      type: "text",
      operators: ["ilike", "contains", "=", "starts_with", "ends_with"],
    },
    {
      name: "summary",
      label: "Resumo",
      type: "text",
      operators: ["ilike", "contains", "="],
    },
    {
      name: "description",
      label: "Descricao",
      type: "text",
      operators: ["ilike", "contains", "="],
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      operators: ["="],
      options: TASK_STATUS_OPTIONS.map((value) => ({ value, label: value })),
    },
    {
      name: "priority",
      label: "Prioridade",
      type: "select",
      operators: ["="],
      options: TASK_PRIORITY_OPTIONS.map((value) => ({ value, label: value })),
    },
    {
      name: "kind",
      label: "Tipo",
      type: "select",
      operators: ["="],
      options: TASK_KIND_OPTIONS.map((value) => ({ value, label: value })),
    },
    {
      name: "owner",
      label: "Responsavel",
      type: "text",
      operators: ["ilike", "contains", "="],
    },
    {
      name: "team",
      label: "Time",
      type: "text",
      operators: ["ilike", "contains", "="],
    },
    {
      name: "dueState",
      label: "Prazo",
      type: "select",
      operators: ["="],
      options: [
        "Sem prazo",
        "Atrasada",
        "Hoje",
        "Proxima",
        "Planejada",
        "Concluida",
      ].map((value) => ({ value, label: value })),
    },
    {
      name: "startDate",
      label: "Inicio",
      type: "date",
      operators: ["between", ">=", "<=", "="],
    },
    {
      name: "dueDate",
      label: "Entrega",
      type: "date",
      operators: ["between", ">=", "<=", "="],
    },
    {
      name: "isMilestone",
      label: "Marco",
      type: "boolean",
      operators: ["="],
      options: [
        { value: "true", label: "Marco" },
        { value: "false", label: "Tarefa" },
      ],
    },
    {
      name: "progress",
      label: "Progresso",
      type: "number",
      operators: [">=", "<=", "="],
    },
    {
      name: "effortPoints",
      label: "Pontos",
      type: "number",
      operators: [">=", "<=", "="],
    },
    {
      name: "tags",
      label: "Tags",
      type: "multi-select",
      operators: ["in", "contains", "is_null", "not_null"],
    },
  ],
  groupBy: [
    { field: "status", label: "Status" },
    { field: "priority", label: "Prioridade" },
    { field: "kind", label: "Tipo" },
    { field: "owner", label: "Responsavel" },
    { field: "team", label: "Time" },
    { field: "dueState", label: "Prazo" },
    { field: "isMilestone", label: "Marco" },
    { field: "tags", label: "Tags" },
  ],
};
