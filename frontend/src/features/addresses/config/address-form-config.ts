import type { FormField, FormStep } from "@/web-client/forms/types";
import type { AddressFormData } from "../domain/types";

export const addressFormFields: FormField<AddressFormData>[] = [
  { name: "label", label: "Nome do endereco", type: "text" },
  { name: "zip", label: "CEP", type: "text" },
  { name: "street", label: "Rua", type: "text" },
  { name: "number", label: "Numero", type: "text" },
  { name: "complement", label: "Complemento", type: "text" },
  { name: "neighborhood", label: "Bairro", type: "text" },
  { name: "city", label: "Cidade", type: "text" },
  {
    name: "state",
    label: "Estado",
    type: "select",
    options: [
      { label: "SP", value: "SP" },
      { label: "RJ", value: "RJ" },
      { label: "MG", value: "MG" },
      { label: "RS", value: "RS" },
      { label: "BA", value: "BA" },
    ],
  },
  { name: "country", label: "Pais", type: "text" },
  { name: "isPrimary", label: "Endereco principal", type: "boolean" },
];

export const addressFormSteps: FormStep[] = [
  {
    title: "Endereco",
    fields: [
      "label",
      "zip",
      "street",
      "number",
      "complement",
      "neighborhood",
      "city",
      "state",
      "country",
      "isPrimary",
    ],
  },
];
