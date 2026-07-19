import type { DateRangeValue } from "@/shared/domain/types";

export type Formation = {
  id: string;
  institution: string;
  course: string;
  level: string;
  status: string;
  period: DateRangeValue;
};

export type FormationFormData = Omit<Formation, "id">;

