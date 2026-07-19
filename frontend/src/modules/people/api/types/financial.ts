import type { ApiHouseholdProfile } from "./household";

export type ApiPersonFinancialEntryType =
  | "INCOME"
  | "EXPENSE"
  | "TRANSFER"
  | "BENEFIT";

export type ApiPersonFinancialEntry = {
  id: string;
  personId: string;
  householdId?: string | null;
  fromHouseholdId?: string | null;
  toHouseholdId?: string | null;
  entryType: ApiPersonFinancialEntryType;
  category: string;
  subcategory?: string | null;
  status?: string | null;
  amount?: number | null;
  frequency: string;
  contractType?: string | null;
  includeInHouseholdBudget: boolean;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ApiFamilyIncomeSummary = {
  totalIncome: number;
  perCapitaIncome: number;
  totalExpenses: number;
  perCapitaExpenses: number;
  benefitsTotal: number;
  pensionTotal: number;
  householdSize: number;
  contributors: string[];
  contributions?: {
    personId: string;
    amount: number;
  }[];
};

export type ApiFamilySummary = {
  relations: {
    livingCount: number;
    externalCount: number;
    guardiansCount: number;
    providersCount: number;
    dependentsCount: number;
    totalRelations: number;
  };
  assets: {
    sharedCount: number;
    individualCount: number;
  };
  incomeSummary: ApiFamilyIncomeSummary;
  householdProfile: ApiHouseholdProfile | null;
};
