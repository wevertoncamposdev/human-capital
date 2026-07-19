"use client";

import * as React from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { RecordForm } from "@/web-client/forms";
import type { FormField } from "@/web-client/forms/types";
import { useAuth } from "@/features/auth/auth-context";
import { API_URL, resolveMediaUrl } from "@/lib/api";
import {
  getTenantSlugFromPath,
  storeTenantSlug,
  withTenantPath,
} from "@/lib/tenant-path";

type TenantPreview = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
};

type LoginFormProps = {
  tenantSlug?: string | null;
};

type CredentialsValues = {
  email: string;
  password: string;
};

type MfaValues = {
  code: string;
  rememberDevice: boolean;
};

export function LoginForm({ tenantSlug }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const resolvedSlug = tenantSlug ?? getTenantSlugFromPath(pathname);
  const { login, verifyMfa } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = React.useState<"credentials" | "mfa">("credentials");
  const [challengeId, setChallengeId] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [tenant, setTenant] = React.useState<TenantPreview | null>(null);
  const [tenantError, setTenantError] = React.useState<string | null>(null);

  const credentialFields = React.useMemo<FormField<CredentialsValues>[]>(
    () => [
      {
        name: "email",
        label: "Email",
        type: "email",
        placeholder: "email@exemplo.com",
        required: true,
      },
      {
        name: "password",
        label: "Senha",
        type: "password",
        placeholder: "Senha",
        required: true,
      },
    ],
    [],
  );

  const mfaFields = React.useMemo<FormField<MfaValues>[]>(
    () => [
      {
        name: "code",
        label: "Código 2FA",
        type: "text",
        placeholder: "000000 ou XXXXX-XXXXX",
        required: true,
        helperText:
          "Use o código do Google Authenticator / Microsoft Authenticator.",
      },
      {
        name: "rememberDevice",
        label: "Confiar neste dispositivo por 30 dias",
        type: "boolean",
      },
    ],
    [],
  );

  const fetchTenantBySlug = React.useCallback(async (slug: string) => {
    const response = await fetch(`${API_URL}/tenants/slug/${slug}`, {
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
    if (!resolvedSlug) return;
    let active = true;
    setTenantError(null);
    fetchTenantBySlug(resolvedSlug)
      .then((data) => {
        if (active) {
          setTenant(data);
        }
      })
      .catch((err) => {
        if (active) {
          setTenant(null);
          setTenantError(
            err && typeof err === "object" && "message" in err
              ? String((err as { message?: string }).message)
              : "Instituição não encontrada",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [resolvedSlug, fetchTenantBySlug]);

  const finishLogin = React.useCallback(() => {
    if (resolvedSlug) storeTenantSlug(resolvedSlug);
    const next = searchParams.get("next") ?? "/dashboard";
    router.replace(withTenantPath(next, resolvedSlug ?? null));
  }, [resolvedSlug, router, searchParams]);

  const handleCredentialsSubmit = React.useCallback(
    async (values: CredentialsValues) => {
      setIsSubmitting(true);
      try {
        const result = await login({
          email: values.email.trim(),
          password: values.password,
        });
        if ("mfaRequired" in result && result.mfaRequired) {
          setChallengeId(result.challengeId);
          setStep("mfa");
          toast({
            title: "Confirmação necessária",
            description: "Digite o código do seu app autenticador.",
          });
          return;
        }
        finishLogin();
      } catch (err) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message)
            : "Falha no login";
        toast({ variant: "destructive", title: "Erro", description: message });
      } finally {
        setIsSubmitting(false);
      }
    },
    [finishLogin, login, toast],
  );

  const handleMfaSubmit = React.useCallback(
    async (values: MfaValues) => {
      setIsSubmitting(true);
      try {
        if (!challengeId) {
          throw new Error("Sessão expirada. Faça login novamente.");
        }
        await verifyMfa({
          challengeId,
          code: values.code,
          rememberDevice: values.rememberDevice,
        });
        finishLogin();
      } catch (err) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message)
            : "Falha no login";
        toast({ variant: "destructive", title: "Erro", description: message });
      } finally {
        setIsSubmitting(false);
      }
    },
    [challengeId, finishLogin, toast, verifyMfa],
  );

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
                <div className="text-sm text-slate-400">
                  Logo da instituição
                </div>
              )}
            </div>
          </div>

          <div className="max-w-md mx-auto w-full p-4 md:p-6">
            <div className="mb-6">
              <h2 className="text-slate-900 text-lg font-semibold">
                {tenant?.name ? `${tenant.name}` : ""}
              </h2>
              <p className="text-sm text-slate-500">
                Informe as credenciais para entrar na instituição.
              </p>
            </div>

            {tenantError ? (
              <p className="mb-3 text-xs text-red-600">{tenantError}</p>
            ) : null}

            {step === "credentials" ? (
              <>
                <RecordForm<CredentialsValues>
                  fields={credentialFields}
                  initialValues={{ email: "admin@exemplo.com", password: "Admin@123" }}
                  onSubmit={handleCredentialsSubmit}
                  disabled={isSubmitting}
                  actions={{
                    submit: {
                      label: isSubmitting ? "Entrando..." : "Entrar",
                      variant: "primary",
                    },
                  }}
                />

                <div className="mt-3 flex items-center justify-end">
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-xs"
                    onClick={() =>
                      router.push(
                        withTenantPath("/forgot-password", resolvedSlug ?? null),
                      )
                    }
                  >
                    Esqueci minha senha
                  </Button>
                </div>
              </>
            ) : (
              <RecordForm<MfaValues>
                fields={mfaFields}
                initialValues={{ code: "", rememberDevice: true }}
                onSubmit={handleMfaSubmit}
                disabled={isSubmitting}
                actions={{
                  cancel: {
                    label: "Voltar",
                    variant: "secondary",
                    onClick: () => {
                      setStep("credentials");
                      setChallengeId(null);
                    },
                  },
                  submit: {
                    label: isSubmitting ? "Confirmando..." : "Confirmar",
                    variant: "primary",
                  },
                }}
              />
            )}

            <div className="mt-6">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => router.push("/register")}
              >
                Registrar nova instituição
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
