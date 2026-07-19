"use client";

import { SectionCard } from "@/components/section-card";
import {
  FamilyMetricBadge,
  FamilyMetricField,
} from "@/modules/people/features/family-members/ui/family-metrics";
import { formatCurrency } from "@/modules/people/shared/domain/utils";
import { useFamilyRelationsContext } from "@/modules/people/features/family-members/context/family-relations-context";
import type { FamilyIncomeSummary } from "@/modules/people/shared/domain/types";

export function FamilyIncomeReport() {
  const { incomeSummary } = useFamilyRelationsContext();
  const summary: FamilyIncomeSummary = incomeSummary ?? {
    totalIncome: 0,
    perCapitaIncome: 0,
    totalExpenses: 0,
    perCapitaExpenses: 0,
    benefitsTotal: 0,
    pensionTotal: 0,
    householdSize: 0,
    contributors: [],
  };
  const hasIncome =
    summary.totalIncome > 0 ||
    summary.benefitsTotal > 0 ||
    summary.pensionTotal > 0 ||
    summary.totalExpenses > 0;

  return (
    <SectionCard
      title="Renda familiar"
      subtitle="Total, per capita e benefícios registrados"
      collapsible
      defaultOpen
      footer={
        <div className="flex flex-wrap gap-2">
          <FamilyMetricBadge
            label="Contribuintes"
            value={summary.contributors?.length ?? 0}
            variant="secondary"
          />
          <FamilyMetricBadge
            label="Familiares monitorados"
            value={summary.householdSize ?? 0}
          />
        </div>
      }
    >
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
        <FamilyMetricField
          label="Renda total"
          value={formatCurrency(summary.totalIncome)}
        />
        <FamilyMetricField
          label="Per capita"
          value={formatCurrency(summary.perCapitaIncome)}
        />
        <FamilyMetricField
          label="Gastos totais"
          value={formatCurrency(summary.totalExpenses)}
        />
        <FamilyMetricField
          label="Gasto per capita"
          value={formatCurrency(summary.perCapitaExpenses)}
        />
        {summary.benefitsTotal > 0 && (
          <FamilyMetricField
          label="Benefícios"
            value={formatCurrency(summary.benefitsTotal)}
          />
        )}
        {summary.pensionTotal > 0 && (
          <FamilyMetricField
          label="Pensão"
            value={formatCurrency(summary.pensionTotal)}
          />
        )}
      </div>
      {!hasIncome ? (
        <p className="text-xs text-muted-foreground">Sem rendas cadastradas.</p>
      ) : null}
    </SectionCard>
  );
}





