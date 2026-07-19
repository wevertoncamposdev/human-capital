import type { FormField, FormStep } from "@/web-client/forms/types";

export type MedicationFormValues = {
  reason?: string;
  medication: string;
  dosage?: string;
  schedule?: string;
  startDate?: string;
  endDate?: string;
  prescribingDoctor?: string;
  permissionDocumentFile?: File | null;
  removePermissionDocument?: boolean;
  documentFile?: File | null;
  removeDocument?: boolean;
  notes?: string;
};

export const medicationReasonOptions = [
  { label: "TDAH", value: "TDAH" },
  { label: "Ansiedade", value: "Ansiedade" },
  { label: "Hipertensao", value: "Hipertensao" },
  { label: "Diabetes", value: "Diabetes" },
  { label: "Outro", value: "Outro" },
];

export const medicationFormFields: FormField<MedicationFormValues>[] = [
  {
    name: "reason",
    label: "Motivo",
    type: "select",
    options: medicationReasonOptions,
  },
  {
    name: "medication",
    label: "Medicamento",
    type: "text",
    required: true,
  },
  { name: "dosage", label: "Dosagem", type: "text" },
  {
    name: "schedule",
    label: "Horarios",
    type: "text",
    placeholder: "Ex: 08h/08h",
  },
  { name: "startDate", label: "Inicio", type: "date" },
  { name: "endDate", label: "Fim", type: "date" },
  {
    name: "prescribingDoctor",
    label: "Profissional responsavel",
    type: "text",
  },
  {
    name: "permissionDocumentFile",
    label: "Upload autorizacao",
    type: "file",
    accept: ".pdf,image/*",
    helperText: "PDF ou imagem. Opcional.",
  },
  {
    name: "documentFile",
    label: "Upload documento medico",
    type: "file",
    accept: ".pdf,image/*",
    helperText: "PDF ou imagem. Opcional.",
  },
  {
    name: "notes",
    label: "Observacoes",
    type: "textarea",
    rows: 3,
  },
];

export const medicationFormSteps: FormStep[] = [
  {
    title: "Medicacao",
    fields: [
      "reason",
      "medication",
      "dosage",
      "schedule",
      "startDate",
      "endDate",
      "prescribingDoctor",
      "permissionDocumentFile",
      "documentFile",
      "notes",
    ],
  },
];
