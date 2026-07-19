import {
  printFamilyReport,
  type FamilyReportType,
} from "@/modules/people/features/family-members/utils/family-report";
import type {
  FamilyIncomeSummary,
  HouseholdAsset,
  HouseholdMember,
  HouseholdProfile,
  Person,
  PersonAssetsGroup,
  PersonRelation,
} from "@/modules/people/shared/domain/types";
import { formatCurrency } from "@/modules/people/shared/domain/utils";

const headers = ["Tipo", "Nome", "Parentesco", "Indicadores"];

const formatIndicators = (items: (string | null | undefined)[]) =>
  items.filter(Boolean).join(" / ") || "-";

export function exportFamilyPdf(params: {
  token: string | null | undefined;
  person: Person;
  householdMembers: HouseholdMember[];
  relations: PersonRelation[];
  incomeSummary: FamilyIncomeSummary | null;
  householdProfile: HouseholdProfile | null;
  householdAssets: HouseholdAsset[];
  personAssetsByMember: PersonAssetsGroup[];
  reportType?: FamilyReportType;
}) {
  if (!params.token) return;
  printFamilyReport({
    token: params.token,
    person: params.person,
    householdMembers: params.householdMembers,
    relations: params.relations,
    incomeSummary: params.incomeSummary,
    householdProfile: params.householdProfile,
    householdAssets: params.householdAssets,
    personAssetsByMember: params.personAssetsByMember,
    reportType: params.reportType,
  });
}

export function buildFamilyCsv(params: {
  householdMembers: HouseholdMember[];
  relations: PersonRelation[];
  incomeContributorIds: string[];
  incomeSummary?: FamilyIncomeSummary | null;
  householdAssets?: HouseholdAsset[];
  personAssetsByMember?: PersonAssetsGroup[];
}) {
  const relationMap = new Map<string, PersonRelation>();
  params.relations.forEach((relation) => {
    relationMap.set(relation.relatedPersonId, relation);
  });
  const contributionMap = new Map<string, number>();
  params.incomeSummary?.contributions?.forEach((item) => {
    contributionMap.set(item.personId, item.amount);
  });

  const rows: string[][] = [];

  params.householdMembers.forEach((member) => {
    const relation = relationMap.get(member.personId);
    const contributionAmount = contributionMap.get(member.personId) ?? 0;
    const indicators = formatIndicators([
      member.isLegalGuardian ? "Responsavel legal" : null,
      member.isProvider ? "Provedor" : null,
      contributionAmount > 0
        ? `Contribui ${formatCurrency(contributionAmount)}`
        : member.isIncomeContributor
        ? "Contribui renda"
        : null,
      member.isDependent ? "Dependente" : null,
    ]);
    rows.push([
      "Mora junto",
      member.person.fullName,
      relation?.type ?? member.role ?? "Morador",
      indicators,
    ]);
  });

  params.relations
    .filter((relation) => !relation.livesTogether)
    .forEach((relation) => {
      const contributionAmount =
        contributionMap.get(relation.relatedPersonId) ?? 0;
      const indicators = formatIndicators([
        relation.isLegalGuardian ? "Responsavel legal" : null,
        contributionAmount > 0
          ? `Contribui ${formatCurrency(contributionAmount)}`
          : params.incomeContributorIds.includes(relation.relatedPersonId)
          ? "Contribui renda"
          : null,
      ]);
      rows.push([
        "Nao mora junto",
        relation.relatedPerson.fullName,
        relation.type,
        indicators,
      ]);
    });

  const summaryRows = [
    ["Resumo", "Renda total", "", formatCurrency(params.incomeSummary?.totalIncome ?? 0)],
    ["Resumo", "Per capita", "", formatCurrency(params.incomeSummary?.perCapitaIncome ?? 0)],
    ["Resumo", "Gastos totais", "", formatCurrency(params.incomeSummary?.totalExpenses ?? 0)],
    ["Resumo", "Gasto per capita", "", formatCurrency(params.incomeSummary?.perCapitaExpenses ?? 0)],
    ["Resumo", "Beneficios", "", formatCurrency(params.incomeSummary?.benefitsTotal ?? 0)],
    ["Resumo", "Pensao", "", formatCurrency(params.incomeSummary?.pensionTotal ?? 0)],
    ["Resumo", "Itens compartilhados", "", String(params.householdAssets?.length ?? 0)],
    [
      "Resumo",
      "Itens individuais",
      "",
      String(
        params.personAssetsByMember?.reduce(
          (sum, group) => sum + group.assets.length,
          0,
        ) ?? 0,
      ),
    ],
  ];

  const csv = [...summaryRows, headers, ...rows]
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  return csv;
}

export function downloadFamilyCsv(params: {
  person: Person;
  householdMembers: HouseholdMember[];
  relations: PersonRelation[];
  incomeContributorIds: string[];
  incomeSummary?: FamilyIncomeSummary | null;
  householdAssets?: HouseholdAsset[];
  personAssetsByMember?: PersonAssetsGroup[];
}) {
  const csv = buildFamilyCsv(params);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute(
    "download",
    `${params.person.fullName.replace(/\\s+/g, "_")}-familia.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}



