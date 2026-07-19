import type { FormField, FormStep } from "@/web-client/forms/types";
import type { GroupFormData } from "../domain/types";

export const groupFormFields: FormField<GroupFormData>[] = [
  { name: "name", label: "Nome do grupo", type: "text" },
  { name: "description", label: "Descricao", type: "textarea" },
  { name: "color", label: "Cor", type: "color" },
];

export const groupFormSteps: FormStep[] = [
  { title: "Grupo", fields: ["name", "description", "color"] },
];
