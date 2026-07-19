import type { ApiPersonSummary } from "./people";

export type ApiHouseholdProfile = {
  id: string;
  householdId: string;
  type?: string | null;
  condition?: string | null;
  ownership?: string | null;
  areaM2?: number | null;
  rooms?: number | null;
  bathrooms?: number | null;
  cep?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  ibge?: string | null;
  gia?: string | null;
  ddd?: string | null;
  siafi?: string | null;
  reference?: string | null;
  notes?: string | null;
};

export type ApiHouseholdAsset = {
  id: string;
  householdId: string;
  category: string;
  item: string;
  quantity?: number | null;
  condition?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiPersonAsset = {
  id: string;
  personId: string;
  category: string;
  item: string;
  quantity?: number | null;
  condition?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiPersonAssetsGroup = {
  person: ApiPersonSummary;
  assets: ApiPersonAsset[];
};
