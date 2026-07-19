"use client";

import type { SearchViewDefinition } from "@/web-client/search/types";

export const pantryHistorySearchView: SearchViewDefinition = {
  id: "pantry.history.search",
  model: "pantry.history",
  searchPlaceholder: "Pesquisar movimentos, itens, doadores ou eventos",
  features: {
    favorites: true,
    presets: false,
    advancedFilters: true,
    groupBy: true,
    clearAll: true,
  },
  filterCombinators: ["and", "or"],
  fields: [
    {
      name: "kind",
      label: "Tipo de movimento",
      type: "select",
      options: [
        { value: "ENTRY", label: "Entrada" },
        { value: "EXIT", label: "Saída" },
      ],
      operators: ["="],
    },
    {
      name: "movementDate",
      label: "Data do movimento",
      type: "date",
      operators: ["between", ">=", "<="],
    },
    {
      name: "sector",
      label: "Setor",
      type: "text",
      operators: ["ilike", "contains", "=", "starts_with", "ends_with"],
    },
    {
      name: "type",
      label: "Tipo de saída",
      type: "select",
      options: [
        { value: "ATTENDED", label: "Atendidos" },
        { value: "DONATION", label: "Doação" },
        { value: "EVENT", label: "Evento" },
        { value: "PARTY", label: "Festa" },
        { value: "CORRECTION", label: "Correção" },
      ],
      operators: ["="],
    },
    {
      name: "eventName",
      label: "Evento",
      type: "text",
      operators: ["ilike", "contains", "="],
    },
    {
      name: "donorName",
      label: "Doador",
      type: "text",
      operators: ["ilike", "contains", "=", "starts_with", "ends_with"],
    },
    {
      name: "itemName",
      label: "Alimento",
      type: "text",
      operators: ["ilike", "contains", "=", "starts_with", "ends_with"],
    },
    {
      name: "itemGroup",
      label: "Grupo do alimento",
      type: "text",
      operators: ["ilike", "contains", "=", "starts_with", "ends_with"],
    },
    {
      name: "expiryDate",
      label: "Validade",
      type: "date",
      operators: ["between", ">=", "<=", "=", "!="],
    },
    {
      name: "actor",
      label: "Usuário",
      type: "text",
      operators: ["ilike", "contains", "=", "starts_with", "ends_with"],
    },
    {
      name: "notes",
      label: "Notas",
      type: "text",
      operators: ["ilike", "contains", "=", "starts_with", "ends_with"],
    },
    {
      name: "itemId",
      label: "Item (ID)",
      type: "uuid",
      operators: ["="],
    },
  ],
  groupBy: [
    { field: "kind", label: "Tipo (Entrada/Saída)" },
    { field: "sector", label: "Setor" },
    { field: "type", label: "Tipo de saída" },
    { field: "itemId", label: "Alimento" },
    { field: "itemGroup", label: "Grupo" },
    { field: "eventName", label: "Evento" },
    { field: "donorName", label: "Doador" },
    { field: "quantity", label: "Quantidade" },
    { field: "unit", label: "Un." },
    { field: "movementDate", label: "Data" },
    { field: "expiryDate", label: "Validade" },
    { field: "actor", label: "Usuário" },
    { field: "notes", label: "Notas" },
  ],
};

export const pantryDonorsSearchView: SearchViewDefinition = {
  id: "pantry.donors.search",
  model: "pantry.donors",
  searchPlaceholder: "Pesquisar doadores por nome, tipo ou contato",
  features: {
    favorites: true,
    presets: false,
    advancedFilters: true,
    groupBy: true,
    clearAll: true,
  },
  filterCombinators: ["and"],
  fields: [
    {
      name: "name",
      label: "Nome",
      type: "text",
      operators: ["ilike", "contains", "=", "starts_with", "ends_with"],
    },
    {
      name: "type",
      label: "Tipo",
      type: "select",
      options: [
        { value: "PERSON", label: "Pessoa" },
        { value: "COMPANY", label: "Empresa" },
      ],
      operators: ["="],
    },
    {
      name: "contact",
      label: "Contato",
      type: "text",
      operators: ["ilike", "contains", "=", "starts_with", "ends_with"],
    },
    {
      name: "tags",
      label: "Tags",
      type: "text",
      operators: ["ilike", "contains", "="],
    },
    {
      name: "createdAt",
      label: "Criado em",
      type: "date",
      operators: ["between", ">=", "<="],
    },
    {
      name: "updatedAt",
      label: "Atualizado em",
      type: "date",
      operators: ["between", ">=", "<="],
    },
  ],
  groupBy: [
    { field: "type", label: "Tipo" },
    { field: "tags", label: "Tags" },
    { field: "createdAt", label: "Cadastro" },
  ],
};

export const pantryEntriesSearchView: SearchViewDefinition = {
  id: "pantry.entries.search",
  model: "pantry.entries",
  searchPlaceholder: "Pesquisar entradas por setor, doador ou notas",
  features: {
    favorites: true,
    presets: false,
    advancedFilters: true,
    groupBy: true,
    clearAll: true,
  },
  filterCombinators: ["and"],
  fields: [
    { name: "donorId", label: "Doador (ID)", type: "uuid", operators: ["="] },
    { name: "sector", label: "Setor", type: "text", operators: ["ilike", "contains", "="] },
    { name: "quantity", label: "Quantidade", type: "number", operators: ["=", ">=", "<=", "between"] },
    { name: "unit", label: "Unidade", type: "text", operators: ["=", "!="] },
    { name: "entryDate", label: "Data da entrada", type: "date", operators: ["between", ">=", "<=", "="] },
    { name: "expiryDate", label: "Validade", type: "date", operators: ["between", ">=", "<=", "="] },
    { name: "notes", label: "Notas", type: "text", operators: ["ilike", "contains", "="] },
  ],
  groupBy: [
    { field: "sector", label: "Setor" },
    { field: "unit", label: "Unidade" },
    { field: "entryDate", label: "Data da entrada" },
    { field: "expiryDate", label: "Validade" },
  ],
};

export const pantryExitsSearchView: SearchViewDefinition = {
  id: "pantry.exits.search",
  model: "pantry.exits",
  searchPlaceholder: "Pesquisar saídas por setor, tipo ou evento",
  features: {
    favorites: true,
    presets: false,
    advancedFilters: true,
    groupBy: true,
    clearAll: true,
  },
  filterCombinators: ["and"],
  fields: [
    { name: "sector", label: "Setor", type: "text", operators: ["ilike", "contains", "="] },
    { name: "quantity", label: "Quantidade", type: "number", operators: ["=", ">=", "<=", "between"] },
    { name: "unit", label: "Unidade", type: "text", operators: ["=", "!="] },
    {
      name: "type",
      label: "Tipo",
      type: "select",
      options: [
        { value: "ATTENDED", label: "Atendido" },
        { value: "DONATION", label: "Doação" },
        { value: "EVENT", label: "Evento" },
        { value: "PARTY", label: "Festa" },
        { value: "CORRECTION", label: "Correção" },
      ],
      operators: ["="],
    },
    { name: "exitDate", label: "Data da saída", type: "date", operators: ["between", ">=", "<=", "="] },
    { name: "eventName", label: "Evento", type: "text", operators: ["ilike", "contains", "="] },
    { name: "notes", label: "Notas", type: "text", operators: ["ilike", "contains", "="] },
  ],
  groupBy: [
    { field: "sector", label: "Setor" },
    { field: "type", label: "Tipo" },
    { field: "exitDate", label: "Data da saída" },
  ],
};

export const pantryStockSearchView: SearchViewDefinition = {
  id: "pantry.stock.search",
  model: "pantry.stock",
  searchPlaceholder: "Pesquisar alimentos, grupos ou setores",
  features: {
    favorites: true,
    presets: true,
    advancedFilters: true,
    groupBy: true,
    clearAll: true,
  },
  presets: [
    {
      id: "below-min",
      label: "Abaixo do mínimo",
      domain: { type: "condition", field: "isBelowMin", operator: "=", value: "true" },
    },
    {
      id: "expired",
      label: "Vencidos",
      domain: { type: "condition", field: "validityStatus", operator: "=", value: "Vencido" },
    },
    {
      id: "urgent",
      label: "Urgente",
      domain: { type: "condition", field: "validityStatus", operator: "=", value: "Urgente" },
    },
  ],
  fields: [
    {
      name: "sector",
      label: "Setor",
      type: "text",
    },
    {
      name: "group",
      label: "Grupo",
      type: "text",
    },
    {
      name: "tags",
      label: "Tags",
      type: "text",
    },
    {
      name: "itemId",
      label: "Item (ID)",
      type: "uuid",
    },
    {
      name: "isBelowMin",
      label: "Abaixo do mínimo",
      type: "boolean",
    },
    {
      name: "validityStatus",
      label: "Validade",
      type: "select",
      options: [
        { value: "Normal", label: "Normal" },
        { value: "Atencao", label: "Atenção" },
        { value: "Alerta", label: "Alerta" },
        { value: "Urgente", label: "Urgente" },
        { value: "Vencido", label: "Vencido" },
        { value: "Sem validade", label: "Sem validade" },
      ],
    },
    {
      name: "nextExpiryDate",
      label: "Próx. validade",
      type: "date",
    },
    {
      name: "createdAt",
      label: "Cadastro",
      type: "date",
    },
  ],
  groupBy: [
    { field: "name", label: "Alimento" },
    { field: "tags", label: "Tags" },
    { field: "sector", label: "Setor" },
    { field: "group", label: "Grupo" },
    { field: "sectorStock", label: "Saldo (setor)" },
    { field: "itemStock", label: "Saldo (total)" },
    { field: "unit", label: "Un." },
    { field: "minStock", label: "Mínimo" },
    { field: "validityStatus", label: "Validade" },
    { field: "isBelowMin", label: "Abaixo do mínimo" },
    { field: "nextExpiryDate", label: "Próx. validade" },
    { field: "daysToExpire", label: "Dias" },
  ],
};

