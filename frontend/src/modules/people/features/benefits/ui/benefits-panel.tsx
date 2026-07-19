"use client";

import { PeopleFinancialRelationsPanel } from "@/modules/people/features/people-financial/ui/people-financial-relations-panel";

export function BenefitsPanel({ personId }: { personId: string }) {
  return <PeopleFinancialRelationsPanel personId={personId} />;
}
