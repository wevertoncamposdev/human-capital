"use client";

import * as React from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { requestPasswordReset } from "@/features/auth/api";
import { API_URL, resolveMediaUrl } from "@/lib/api";
import { withTenantPath } from "@/lib/tenant-path";
import { RecordForm } from "@/web-client/forms";
import type { FormField } from "@/web-client/forms/types";

type TenantPreview = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
};

type ForgotPasswordValues = {
  email: string;
};

export default function ForgotPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const slug = typeof params?.tenant === "string" ? params.tenant : "";
  const [loading, setLoading] = React.useState(false);
  const [tenant, setTenant] = React.useState<TenantPreview | null>(null);
  const [tenantError, setTenantError] = React.useState<string | null>(null);
  const fields = React.useMemo<FormField<ForgotPasswordValues>[]>(
    () => [
      {
        name: "email",
        label: "Email",
        type: "email",
        placeholder: "email@exemplo.com",
        required: true,
      },
    ],
    [],
  );

  const fetchTenantBySlug = React.useCallback(async (tenantSlug: string) => {
    const response = await fetch(`${API_URL}/tenants/slug/${tenantSlug}`, {
      cache: "no-store",
    });
    if (response.status === 404) {
      throw new Error("Instituição não encontrada");
    }
    if (!response.ok) {
      const contentType = response.headers.get("content-type") ?? "";
      const payload = contentType.includes("application/json")
        ? await response.json().catch(() => null)
        : null;
      const message =
        payload && typeof payload === "object" && "message" in payload
          ? String((payload as { message?: unknown }).message ?? "")
          : "";
      throw new Error(
        message.trim()
          ? message
          : `Falha ao carregar instituição (status ${response.status}). Verifique a API.`,
      );
    }
    return response.json() as Promise<TenantPreview>;
  }, []);

  React.useEffect(() => {
    if (!slug) return;
    let active = true;
    setTenantError(null);
    fetchTenantBySlug(slug)
      .then((data) => {
        if (active) setTenant(data);
      })
      .catch((err) => {
        if (!active) return;
        setTenant(null);
        setTenantError(
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message)
            : "Instituição não encontrada",
        );
      });
    return () => {
      active = false;
    };
  }, [slug, fetchTenantBySlug]);

  const onSubmit = async (values: ForgotPasswordValues) => {
    const email = values.email.trim();
    if (!email) {
      toast({
        variant: "destructive",
        title: "Email",
        description: "Informe um email válido.",
      });
      return;
    }

    setLoading(true);
    try {
      await requestPasswordReset(email);
      toast({
        title: "Pronto",
        description:
          "Se existir uma conta com este email, enviaremos um link de redefinição.",
      });
      router.replace(withTenantPath("/login", slug));
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Falha ao solicitar redefinição.";
      toast({ variant: "destructive", title: "Erro", description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen w-full flex items-center justify-center p-4">
      <div className="w-full max-w-5xl mx-auto bg-white [box-shadow:0_2px_10px_-3px_rgba(6,81,237,0.3)] p-4 lg:p-5 rounded-md">
        <div className="grid md:grid-cols-[1.05fr_0.95fr] items-center gap-y-8 gap-x-8">
          <div className="w-full h-full">
            <div className="aspect-square rounded-md overflow-hidden w-full h-full flex items-center justify-center">
              {tenant?.logoUrl ? (
                <Image
                  src={resolveMediaUrl(tenant.logoUrl) || tenant.logoUrl}
                  alt={tenant.name}
                  width={480}
                  height={480}
                  unoptimized
                  className="max-h-120 w-auto object-contain"
                />
              ) : (
                <div className="text-sm text-slate-400">Logo da instituição</div>
              )}
            </div>
          </div>

          <div className="max-w-md mx-auto w-full p-4 md:p-6">
            <div className="mb-6">
              <h2 className="text-slate-900 text-lg font-semibold">
                {tenant?.name ? `${tenant.name}` : ""}
              </h2>
              <p className="text-sm text-slate-500">
                Informe o email para receber o link de redefinição.
              </p>
            </div>

            {tenantError ? (
              <p className="mb-3 text-xs text-red-600">{tenantError}</p>
            ) : null}

            <RecordForm<ForgotPasswordValues>
              fields={fields}
              initialValues={{ email: "" }}
              onSubmit={onSubmit}
              disabled={loading}
              actions={{
                submit: { label: loading ? "Enviando..." : "Enviar link", variant: "primary" },
                cancel: {
                  label: "Voltar",
                  variant: "secondary",
                  onClick: () => router.push(withTenantPath("/login", slug)),
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
