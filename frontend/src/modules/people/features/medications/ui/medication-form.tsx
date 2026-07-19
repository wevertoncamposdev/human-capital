"use client";

import { RecordForm } from "@/web-client/forms";
import type { FormField, FormStep } from "@/web-client/forms/types";
import {
  medicationFormFields,
  medicationFormSteps,
  type MedicationFormValues,
} from "@/modules/people/features/medications/config/medication-form-config";

type MedicationFormProps = {
  initialValues?: Partial<MedicationFormValues>;
  onSubmit: (values: MedicationFormValues) => void;
  onValuesChange?: (values: MedicationFormValues) => void;
  onFieldCommit?: (values: MedicationFormValues) => void;
  onCancel?: () => void;
  submitLabel?: string;
  showRemoveDocument?: boolean;
  showRemovePermissionDocument?: boolean;
  hideActions?: boolean;
};

export function MedicationForm({
  initialValues,
  onSubmit,
  onValuesChange,
  onFieldCommit,
  onCancel,
  submitLabel = "Salvar",
  showRemoveDocument = false,
  showRemovePermissionDocument = false,
  hideActions = false,
}: MedicationFormProps) {
  const removeDocumentField: FormField<MedicationFormValues> = {
    name: "removeDocument",
    label: "Remover documento atual",
    type: "boolean",
    helperText: "Marque para excluir o documento salvo.",
  };

  const removePermissionDocumentField: FormField<MedicationFormValues> = {
    name: "removePermissionDocument",
    label: "Remover autorizacao atual",
    type: "boolean",
    helperText: "Marque para excluir a autorizacao salva.",
  };

  const insertAfterField = (
    fields: FormField<MedicationFormValues>[],
    fieldName: string,
    field: FormField<MedicationFormValues>,
  ) => {
    const next = [...fields];
    const index = next.findIndex((item) => item.name === fieldName);
    if (index === -1) {
      next.push(field);
      return next;
    }
    next.splice(index + 1, 0, field);
    return next;
  };

  const buildFields = () => {
    let fields = medicationFormFields;
    if (showRemovePermissionDocument) {
      fields = insertAfterField(
        fields,
        "permissionDocumentFile",
        removePermissionDocumentField,
      );
    }
    if (showRemoveDocument) {
      fields = insertAfterField(fields, "documentFile", removeDocumentField);
    }
    return fields;
  };

  const buildSteps = (): FormStep[] => {
    if (!showRemoveDocument && !showRemovePermissionDocument) {
      return medicationFormSteps;
    }
    return medicationFormSteps.map((step) => ({
      ...step,
      fields: step.fields.flatMap((field) => {
        if (field === "permissionDocumentFile" && showRemovePermissionDocument) {
          return ["permissionDocumentFile", "removePermissionDocument"];
        }
        if (field === "documentFile" && showRemoveDocument) {
          return ["documentFile", "removeDocument"];
        }
        return [field];
      }),
    }));
  };

  return (
    <RecordForm
      appearance="inline-detail"
      fields={buildFields()}
      steps={buildSteps()}
      initialValues={initialValues}
      onSubmit={onSubmit}
      onValuesChange={onValuesChange}
      onFieldCommit={({ values }) => onFieldCommit?.(values)}
      actions={
        hideActions
          ? undefined
          : {
              submit: { label: submitLabel, variant: "primary" },
              cancel: onCancel
                ? { label: "Cancelar", onClick: onCancel, variant: "ghost" }
                : undefined,
            }
      }
    />
  );
}

