import type { FormField, FormStep } from "@/web-client/forms/types";
import type { ContactFormData } from "../domain/types";

export const contactFormFields: FormField<ContactFormData>[] = [
  { name: "name", label: "Nome do contato", type: "text" },
  {
    name: "relationship",
    label: "Relacionamento",
    type: "select",
    options: [
      { label: "Familiar", value: "Familiar" },
      { label: "Responsavel", value: "Responsavel" },
      { label: "Emergencia", value: "Emergencia" },
      { label: "Outro", value: "Outro" },
    ],
  },
  { name: "email", label: "Email", type: "email" },
  { name: "phone", label: "Telefone", type: "phone" },
  { name: "isPrimary", label: "Contato principal", type: "boolean" },
  { name: "notes", label: "Observacoes", type: "textarea" },
];

export const contactFormSteps: FormStep[] = [
  {
    title: "Contato",
    fields: ["name", "relationship", "email", "phone", "isPrimary", "notes"],
  },
];
