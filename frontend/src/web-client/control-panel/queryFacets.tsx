"use client";

import { Layers, SlidersHorizontal } from "lucide-react";
import type { Domain } from "@/web-client/domain/types";
import type { SearchViewDefinition } from "@/web-client/search/types";
import { collectAndConditions } from "@/web-client/data-provider/rest/domain-utils";
import type { SearchFacet } from "@/web-client/control-panel/SearchBar";

function operatorLabel(operator: string) {
  switch (operator) {
    case "contains":
    case "ilike":
      return "contém";
    case "starts_with":
      return "começa com";
    case "ends_with":
      return "termina com";
    case "=":
      return "=";
    case "!=":
      return "≠";
    case ">":
      return ">";
    case ">=":
      return "≥";
    case "<":
      return "<";
    case "<=":
      return "≤";
    case "between":
      return "entre";
    case "in":
      return "em";
    case "not_in":
      return "fora";
    case "is_null":
      return "vazio";
    case "not_null":
      return "não vazio";
    default:
      return operator;
  }
}

function describeValue(
  fieldName: string,
  value: unknown,
  searchView: SearchViewDefinition,
): string {
  const field = searchView.fields.find((f) => f.name === fieldName);
  if (
    field?.type === "select" ||
    field?.type === "multi-select" ||
    field?.type === "boolean" ||
    field?.type === "enum"
  ) {
    if (Array.isArray(value)) {
      return value
        .map((entry) => {
          const option = field.options?.find((candidate) => candidate.value === String(entry));
          return option?.label ?? String(entry ?? "");
        })
        .filter(Boolean)
        .join(", ");
    }

    const option = field.options?.find((candidate) => candidate.value === String(value));
    return option?.label ?? String(value ?? "");
  }
  if (field?.type === "date" && Array.isArray(value)) {
    const [from, to] = value;
    const fromLabel = String(from ?? "").slice(0, 10);
    const toLabel = String(to ?? "").slice(0, 10);
    if (fromLabel && toLabel) return `${fromLabel} → ${toLabel}`;
  }
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    return value.map((v) => String(v ?? "")).filter(Boolean).join(", ");
  }
  return String(value);
}

function fieldLabel(fieldName: string, searchView: SearchViewDefinition) {
  return searchView.fields.find((f) => f.name === fieldName)?.label ?? fieldName;
}

function groupByLabel(fieldName: string, searchView: SearchViewDefinition) {
  return searchView.groupBy?.find((g) => g.field === fieldName)?.label ?? fieldName;
}

export function buildQueryFacets({
  domain,
  groupBy,
  searchView,
  onClearGroupBy,
  onClearDomain,
  onRemoveDomainCondition,
}: {
  domain: Domain;
  groupBy: string[];
  searchView: SearchViewDefinition;
  onClearGroupBy?: () => void;
  onClearDomain?: () => void;
  onRemoveDomainCondition?: (index: number) => void;
}): SearchFacet[] {
  const facets: SearchFacet[] = [];

  if (groupBy.length) {
    const label = groupBy.map((field) => groupByLabel(field, searchView)).join(" > ");
    facets.push({
      key: `groupBy:${groupBy.join(",")}`,
      label,
      icon: <Layers className="size-3.5" />,
      tone: "group",
      onRemove: onClearGroupBy,
      removeLabel: "Limpar agrupamento",
    });
  }

  const conditions = collectAndConditions(domain);
  if (!conditions) {
    if (domain) {
      facets.push({
        key: "domain:advanced",
        label: "Filtro avançado",
        icon: <SlidersHorizontal className="size-3.5" />,
        onRemove: onClearDomain,
        removeLabel: "Limpar filtros",
      });
    }
    return facets;
  }

  conditions.forEach((cond, index) => {
    const label = fieldLabel(cond.field, searchView);
    const op = operatorLabel(cond.operator);
    const value = describeValue(cond.field, cond.value, searchView);
    const rendered = value ? `${label} ${op} ${value}` : `${label} ${op}`;

    facets.push({
      key: `domain:${cond.field}:${cond.operator}:${index}`,
      label: rendered,
      icon: <SlidersHorizontal className="size-3.5" />,
      onRemove: onRemoveDomainCondition
        ? () => onRemoveDomainCondition(index)
        : onClearDomain,
      removeLabel: "Remover filtro",
    });
  });

  return facets;
}
