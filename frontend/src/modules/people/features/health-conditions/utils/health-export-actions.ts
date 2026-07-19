import type { HealthCondition, Person } from "@/modules/people/shared/domain/types";
import { formatDate } from "@/modules/people/shared/domain/utils";
import { printHealthReport } from "@/modules/people/features/health-conditions/utils/health-report";

const csvHeaders = [
  "Tipo",
  "Descricao",
  "Severidade",
  "Diagnostico",
  "Documento",
  "Observacoes",
];

export function exportHealthPdf(params: {
  token: string | null | undefined;
  person: Person;
  conditions: HealthCondition[];
}) {
  if (!params.token) return;
  printHealthReport({
    token: params.token,
    person: params.person,
    conditions: params.conditions,
  });
}

export function buildHealthCsv(params: { conditions: HealthCondition[] }) {
  const rows = params.conditions.map((condition) => [
    condition.type,
    condition.description ?? "-",
    condition.severity ?? "-",
    condition.diagnosisDate ? formatDate(condition.diagnosisDate) : "-",
    condition.documentUrl ?? "-",
    condition.notes ?? "-",
  ]);

  return [csvHeaders, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export function downloadHealthCsv(params: {
  person: Person;
  conditions: HealthCondition[];
}) {
  const csv = buildHealthCsv({ conditions: params.conditions });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute(
    "download",
    `${params.person.fullName.replace(/\s+/g, "_")}-saude.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}



