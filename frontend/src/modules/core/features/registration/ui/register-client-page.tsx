"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RecordForm } from "@/web-client/forms";
import type { FormField } from "@/web-client/forms/types";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  buildGoogleRegistrationUrl,
  buildMicrosoftRegistrationUrl,
  requestTenantRegistration,
} from "@/modules/core/api/registration";
import { slugify } from "@/modules/core/features/registration/domain/slug";

type RegisterValues = {
  tenantName: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  adminPasswordConfirm: string;
};

const fields: FormField<RegisterValues>[] = [
  { name: "tenantName", label: "Nome da instituição", type: "text", required: true },
  { name: "adminName", label: "Nome do administrador", type: "text", required: true },
  { name: "adminEmail", label: "Email do administrador", type: "email", required: true },
  { name: "adminPassword", label: "Senha", type: "password", required: true },
  { name: "adminPasswordConfirm", label: "Confirmar senha", type: "password", required: true },
];

export function RegisterClientPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [tenantName, setTenantName] = React.useState("");

  const initialValues = React.useMemo<RegisterValues>(
    () => ({
      tenantName: "",
      adminName: "",
      adminEmail: "",
      adminPassword: "",
      adminPasswordConfirm: "",
    }),
    [],
  );

  const previewSlug = React.useMemo(() => (tenantName ? slugify(tenantName) : ""), [tenantName]);

  const handleSubmit = async (values: RegisterValues) => {
    if (values.adminPassword !== values.adminPasswordConfirm) {
      toast({ variant: "destructive", title: "Senha", description: "As senhas não conferem." });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = await requestTenantRegistration({
        tenantName: values.tenantName,
        adminName: values.adminName,
        adminEmail: values.adminEmail,
        adminPassword: values.adminPassword,
      });
      toast({
        variant: "success",
        title: "Código enviado",
        description: "Enviamos um código para confirmar o cadastro.",
      });
      if (typeof window !== "undefined") {
        const redirectUrl = new URL("/register/confirm", window.location.origin);
        redirectUrl.searchParams.set("rid", payload.registrationId);
        window.location.assign(redirectUrl.toString());
        return;
      }
      const redirectPath = `/register/confirm?rid=${encodeURIComponent(payload.registrationId)}`;
      router.push(redirectPath);
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: unknown }).message)
          : "Falha ao cadastrar.";
      toast({ variant: "destructive", title: "Erro", description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-md p-4 space-y-6 sm:p-6 md:p-10">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Criar instituição</h1>
          <p className="text-sm text-muted-foreground">
            O slug é gerado automaticamente: <span className="font-mono">{previewSlug || "..."}</span>
          </p>
        </div>

        <RecordForm<RegisterValues>
          fields={fields}
          initialValues={initialValues}
          onValuesChange={(values) => setTenantName(values.tenantName ?? "")}
          onSubmit={handleSubmit}
          disabled={isSubmitting}
          actions={{
            submit: { label: isSubmitting ? "Enviando..." : "Cadastrar", variant: "primary" },
          }}
        />

        <div className="border-t pt-6 space-y-3">
          <p className="text-sm text-muted-foreground">Ou continue com:</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={!tenantName.trim()}
              onClick={() => window.location.assign(buildGoogleRegistrationUrl(tenantName.trim()))}
            >
              Google
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!tenantName.trim()}
              onClick={() => window.location.assign(buildMicrosoftRegistrationUrl(tenantName.trim()))}
            >
              Microsoft
            </Button>
          </div>
          {!tenantName.trim() ? (
            <p className="text-xs text-muted-foreground">Informe o nome da instituição para usar OAuth.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
