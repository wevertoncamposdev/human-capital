import type { Medication, Person } from "@/modules/people/shared/domain/types";
import { formatDate } from "@/modules/people/shared/domain/utils";
import { printMedicationReport } from "@/modules/people/features/medications/utils/medication-report";

const csvHeaders = [
  "Medicamento",
  "Motivo",
  "Dosagem",
  "Horarios",
  "Inicio",
  "Fim",
  "Documento",
  "Autorizacao",
  "Observacoes",
];

export function exportMedicationPdf(params: {
  token: string | null | undefined;
  person: Person;
  medications: Medication[];
}) {
  if (!params.token) return;
  printMedicationReport({
    token: params.token,
    person: params.person,
    medications: params.medications,
  });
}

export function buildMedicationCsv(params: { medications: Medication[] }) {
  const rows = params.medications.map((medication) => [
    medication.medication,
    medication.reason ?? "-",
    medication.dosage ?? "-",
    medication.schedule ?? "-",
    medication.startDate ? formatDate(medication.startDate) : "-",
    medication.endDate ? formatDate(medication.endDate) : "-",
    medication.documentUrl ?? "-",
    medication.permissionDocumentUrl ?? "-",
    medication.notes ?? "-",
  ]);

  return [csvHeaders, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

export function downloadMedicationCsv(params: {
  person: Person;
  medications: Medication[];
}) {
  const csv = buildMedicationCsv({ medications: params.medications });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute(
    "download",
    `${params.person.fullName.replace(/\s+/g, "_")}-medicacoes.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}



