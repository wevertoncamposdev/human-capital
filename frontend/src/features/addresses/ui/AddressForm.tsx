"use client";

import { RecordForm } from "@/web-client/forms";
import type { AddressFormData } from "../domain/types";
import { addressFormFields, addressFormSteps } from "../config/address-form-config";

type AddressFormProps = {
  initialValues?: Partial<AddressFormData>;
  onSubmit: (values: AddressFormData) => void;
  onCancel?: () => void;
  submitLabel?: string;
};

export function AddressForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = "Salvar",
}: AddressFormProps) {
  return (
    <RecordForm
      fields={addressFormFields}
      steps={addressFormSteps}
      initialValues={initialValues}
      onSubmit={onSubmit}
      actions={{
        submit: { label: submitLabel, variant: "primary" },
        cancel: onCancel ? { label: "Cancelar", onClick: onCancel, variant: "ghost" } : undefined,
      }}
    />
  );
}
