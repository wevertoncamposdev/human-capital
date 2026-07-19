import type { DateRangeValue, RangeValue } from "@/shared/domain/types";

export type IncomeProfile = {
  id: string;
  income: number;
  incomeRange: RangeValue;
  otherIncome: number;
  benefits: string[];
  employmentStatus: string;
  employmentPeriod: DateRangeValue;
};

export type IncomeProfileFormData = Omit<IncomeProfile, "id">;

