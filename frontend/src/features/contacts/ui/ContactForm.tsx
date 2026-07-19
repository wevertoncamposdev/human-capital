"use client";

import { RecordForm } from "@/web-client/forms";
import type { ContactFormData } from "../domain/types";
import { contactFormFields, contactFormSteps } from "../config/contact-form-config";

type ContactFormProps = {
  initialValues?: Partial<ContactFormData>;
  onSubmit: (values: ContactFormData) => void;
  onCancel?: () => void;
  submitLabel?: string;
};

export function ContactForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = "Salvar",
}: ContactFormProps) {
  return (
    <RecordForm
      fields={contactFormFields}
      steps={contactFormSteps}
      initialValues={initialValues}
      onSubmit={onSubmit}
      actions={{
        submit: { label: submitLabel, variant: "primary" },
        cancel: onCancel ? { label: "Cancelar", onClick: onCancel, variant: "ghost" } : undefined,
      }}
    />
  );
}
