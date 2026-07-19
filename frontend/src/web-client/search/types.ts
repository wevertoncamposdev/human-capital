"use client";

import type { Domain, DomainCombinator, DomainOperator } from "@/web-client/domain/types";

export type SearchFieldType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "boolean"
  | "multi-select"
  | "uuid"
  | "enum";

export type SearchFieldOption = { value: string; label: string };

export type SearchFieldDefinition = {
  name: string;
  label: string;
  type: SearchFieldType;
  operators?: DomainOperator[];
  options?: SearchFieldOption[];
  placeholder?: string;
  defaultOperator?: DomainOperator;
  emptyValueLabel?: string;
};

export type SearchViewPreset = {
  id: string;
  label: string;
  domain: Domain;
};

export type SearchViewFeatureConfig = Partial<{
  favorites: boolean;
  presets: boolean;
  advancedFilters: boolean;
  groupBy: boolean;
  clearAll: boolean;
}>;

export type SearchViewDefinition = {
  id: string;
  model: string;
  fields: SearchFieldDefinition[];
  presets?: SearchViewPreset[];
  groupBy?: Array<{ field: string; label: string }>;
  filterCombinators?: DomainCombinator[];
  searchPlaceholder?: string;
  features?: SearchViewFeatureConfig;
};
