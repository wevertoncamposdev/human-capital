"use client";

import type { SearchViewDefinition } from "@/web-client/search/types";

export const depositHistorySearchView: SearchViewDefinition = {
  id: "deposit.history.search",
  model: "deposit.history",
  searchPlaceholder: "Pesquisar movimentos, itens, origens ou eventos",
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
        { value: "EXIT", label: "Saida" },
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
      label: "Tipo de saida",
      type: "select",
      options: [
        { value: "ATTENDED", label: "Atendidos" },
        { value: "DONATION", label: "Doacao" },
        { value: "EVENT", label: "Evento" },
        { value: "PARTY", label: "Festa" },
        { value: "CORRECTION", label: "Correcao" },
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
      label: "Origem",
      type: "text",
      operators: ["ilike", "contains", "=", "starts_with", "ends_with"],
    },
    {
      name: "itemName",
      label: "Objeto",
      type: "text",
      operators: ["ilike", "contains", "=", "starts_with", "ends_with"],
    },
    {
      name: "itemGroup",
      label: "Grupo do objeto",
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
      label: "Usuario",
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
    { field: "kind", label: "Tipo (Entrada/Saida)" },
    { field: "sector", label: "Setor" },
    { field: "type", label: "Tipo de saida" },
    { field: "itemId", label: "Objeto" },
    { field: "itemGroup", label: "Grupo" },
    { field: "eventName", label: "Evento" },
    { field: "donorName", label: "Origem" },
    { field: "quantity", label: "Quantidade" },
    { field: "unit", label: "Un." },
    { field: "movementDate", label: "Data" },
    { field: "expiryDate", label: "Validade" },
    { field: "actor", label: "Usuario" },
    { field: "notes", label: "Notas" },
  ],
};

export const depositDonorsSearchView: SearchViewDefinition = {
  id: "deposit.donors.search",
  model: "deposit.donors",
  searchPlaceholder: "Pesquisar origens por nome, tipo ou contato",
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

export const depositEntriesSearchView: SearchViewDefinition = {
  id: "deposit.entries.search",
  model: "deposit.entries",
  searchPlaceholder: "Pesquisar entradas por setor, origem ou notas",
  features: {
    favorites: true,
    presets: false,
    advancedFilters: true,
    groupBy: true,
    clearAll: true,
  },
  filterCombinators: ["and"],
  fields: [
    { name: "donorId", label: "Origem (ID)", type: "uuid", operators: ["="] },
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

export const depositExitsSearchView: SearchViewDefinition = {
  id: "deposit.exits.search",
  model: "deposit.exits",
  searchPlaceholder: "Pesquisar saidas por setor, tipo ou evento",
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
        { value: "DONATION", label: "Doacao" },
        { value: "EVENT", label: "Evento" },
        { value: "PARTY", label: "Festa" },
        { value: "CORRECTION", label: "Correcao" },
      ],
      operators: ["="],
    },
    { name: "exitDate", label: "Data da saida", type: "date", operators: ["between", ">=", "<=", "="] },
    { name: "eventName", label: "Evento", type: "text", operators: ["ilike", "contains", "="] },
    { name: "notes", label: "Notas", type: "text", operators: ["ilike", "contains", "="] },
  ],
  groupBy: [
    { field: "sector", label: "Setor" },
    { field: "type", label: "Tipo" },
    { field: "exitDate", label: "Data da saida" },
  ],
};

export const depositStockSearchView: SearchViewDefinition = {
  id: "deposit.stock.search",
  model: "deposit.stock",
  searchPlaceholder: "Pesquisar objetos, grupos ou setores",
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
      label: "Abaixo do minimo",
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
      label: "Abaixo do minimo",
      type: "boolean",
    },
    {
      name: "validityStatus",
      label: "Validade",
      type: "select",
      options: [
        { value: "Normal", label: "Normal" },
        { value: "Atencao", label: "Atencao" },
        { value: "Alerta", label: "Alerta" },
        { value: "Urgente", label: "Urgente" },
        { value: "Vencido", label: "Vencido" },
        { value: "Sem validade", label: "Sem validade" },
      ],
    },
    {
      name: "nextExpiryDate",
      label: "Prox. validade",
      type: "date",
    },
    {
      name: "createdAt",
      label: "Cadastro",
      type: "date",
    },
  ],
  groupBy: [
    { field: "name", label: "Objeto" },
    { field: "tags", label: "Tags" },
    { field: "sector", label: "Setor" },
    { field: "group", label: "Grupo" },
    { field: "sectorStock", label: "Saldo (setor)" },
    { field: "itemStock", label: "Saldo (total)" },
    { field: "unit", label: "Un." },
    { field: "minStock", label: "M?nimo" },
    { field: "validityStatus", label: "Validade" },
    { field: "isBelowMin", label: "Abaixo do minimo" },
    { field: "nextExpiryDate", label: "Prox. validade" },
    { field: "daysToExpire", label: "Dias" },
  ],
};

