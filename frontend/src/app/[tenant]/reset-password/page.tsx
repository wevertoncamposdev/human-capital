"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { resetPassword } from "@/features/auth/api";
import { withTenantPath } from "@/lib/tenant-path";
import { RecordForm } from "@/web-client/forms";
import type { FormField } from "@/web-client/forms/types";

type ResetPasswordValues = {
  password: string;
  confirm: string;
};

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const slug = typeof params?.tenant === "string" ? params.tenant : "";
  const token = searchParams.get("token") ?? "";

  const [loading, setLoading] = React.useState(false);

  const fields = React.useMemo<FormField<ResetPasswordValues>[]>(
    () => [
      { name: "password", label: "Nova senha", type: "password", required: true },
      { name: "confirm", label: "Confirmar senha", type: "password", required: true },
    ],
    [],
  );

  const onSubmit = async (values: ResetPasswordValues) => {
    if (!token.trim()) {
      toast({
        variant: "destructive",
        title: "Token",
        description: "Link inválido ou expirado.",
      });
      return;
    }
    if (values.password.length < 8) {
      toast({
        variant: "destructive",
        title: "Senha",
        description: "Use uma senha com no mínimo 8 caracteres.",
      });
      return;
    }
    if (values.password !== values.confirm) {
      toast({
        variant: "destructive",
        title: "Senha",
        description: "As senhas não conferem.",
      });
      return;
    }

    setLoading(true);
    try {
      await resetPassword({ token, password: values.password });
      toast({
        title: "Senha atualizada",
        description: "Faça login com a nova senha.",
      });
      router.replace(withTenantPath("/login", slug));
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Falha ao redefinir senha.";
      toast({ variant: "destructive", title: "Erro", description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">
          Redefinir senha
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Defina uma nova senha para sua conta.
        </p>

        <div className="mt-6">
          <RecordForm<ResetPasswordValues>
            fields={fields}
            initialValues={{ password: "", confirm: "" }}
            onSubmit={onSubmit}
            disabled={loading}
            actions={{
              cancel: {
                label: "Voltar",
                variant: "secondary",
                onClick: () => router.push(withTenantPath("/login", slug)),
              },
              submit: { label: loading ? "Salvando..." : "Salvar", variant: "primary" },
            }}
          />
        </div>
      </div>
    </div>
  );
}
