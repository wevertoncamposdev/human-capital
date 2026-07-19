"use client";

import * as React from "react";
import type {
  FamilyIncomeSummary,
  FamilySummary,
  HouseholdProfile,
  HouseholdAsset,
  PersonAssetsGroup,
  PersonRelation,
  PersonRelationInput,
  PersonRelationsResponse,
  PersonSummary,
} from "@/modules/people/shared/domain/types";
import { useFamilyRelations } from "@/modules/people/features/family-members/data/use-family-relations";

type AssetInput = {
  category: string;
  item: string;
  quantity?: number | null;
  condition?: string | null;
  notes?: string | null;
};

type FamilyRelationsContextValue = {
  data: PersonRelationsResponse | null;
  peopleOptions: PersonSummary[];
  incomeSummary: FamilyIncomeSummary | null;
  householdProfile: HouseholdProfile | null;
  householdAssets: HouseholdAsset[];
  personAssetsByMember: PersonAssetsGroup[];
  summary: FamilySummary | null;
  summaryLoading: boolean;
  summaryError: string | null;
  detailedLoading: boolean;
  detailedError: string | null;
  loadSummary: (force?: boolean) => Promise<void>;
  loadDetailed: (force?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  loadTimes: { summaryMs?: number; detailedMs?: number };
  create: (payload: PersonRelationInput) => Promise<PersonRelation | null>;
  update: (
    relationId: string,
    payload: Partial<PersonRelationInput>,
  ) => Promise<PersonRelation | null>;
  remove: (relationId: string) => Promise<void>;
  upsertHouseholdProfile: (payload: Partial<HouseholdProfile>) => Promise<void>;
  createHouseholdAsset: (payload: AssetInput) => Promise<void>;
  updateHouseholdAsset: (
    assetId: string,
    payload: Partial<AssetInput>,
  ) => Promise<void>;
  removeHouseholdAsset: (assetId: string) => Promise<void>;
  createPersonAsset: (personId: string, payload: AssetInput) => Promise<void>;
  updatePersonAsset: (
    personId: string,
    assetId: string,
    payload: Partial<AssetInput>,
  ) => Promise<void>;
  removePersonAsset: (personId: string, assetId: string) => Promise<void>;
};

const FamilyRelationsContext =
  React.createContext<FamilyRelationsContextValue | null>(null);

export function FamilyRelationsProvider({
  personId,
  initialMode = "summary",
  autoLoad = true,
  children,
}: {
  personId: string;
  initialMode?: "summary" | "detailed";
  autoLoad?: boolean;
  children: React.ReactNode;
}) {
  const value = useFamilyRelations(personId, { initialMode, autoLoad });
  return (
    <FamilyRelationsContext.Provider value={value}>
      {children}
    </FamilyRelationsContext.Provider>
  );
}

export function useFamilyRelationsContext() {
  const context = React.useContext(FamilyRelationsContext);
  if (!context) {
    throw new Error(
      "useFamilyRelationsContext deve ser usado dentro de FamilyRelationsProvider",
    );
  }
  return context;
}



