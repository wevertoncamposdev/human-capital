"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import {
  readStoredTenantSlug,
  storeTenantSlug,
  withTenantPath,
} from "@/lib/tenant-path";
import { RecordForm } from "@/web-client/forms";
import type { FormField } from "@/web-client/forms/types";

type TenantSlugValues = {
  tenantSlug: string;
};

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const fields = React.useMemo<FormField<TenantSlugValues>[]>(
    () => [
      {
        name: "tenantSlug",
        label: "Instituição",
        type: "text",
        placeholder: "instituicao-exemplo",
        required: true,
      },
    ],
    [],
  );

  React.useEffect(() => {
    if (isLoading) return;
    const stored = readStoredTenantSlug();
    if (!stored) return;
    const target = isAuthenticated ? "/dashboard" : "/login";
    router.replace(withTenantPath(target, stored));
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen w-full bg-gray-100 flex items-center justify-center px-4">
      {/* Card */}
      <div className="w-full max-w-5xl bg-white rounded-xl shadow-md p-6 md:p-10">
        {/* Grid Interno */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          {/* Coluna 1 - Formulário */}
          <div className="w-full max-w-md mx-auto">
            <RecordForm<TenantSlugValues>
              fields={fields}
              onSubmit={(values) => {
                const slug = values.tenantSlug.trim();
                if (!slug) return;
                storeTenantSlug(slug);
                router.replace(withTenantPath("/login", slug));
              }}
              actions={{ submit: { label: "Continuar", variant: "primary" } }}
            />

            <p className="text-xs text-gray-500 text-center mt-4">
              Exemplo: instituicao-exemplo
            </p>
          </div>

          {/* Coluna 2 - Logo Grande */}
          <div className="hidden md:flex items-center justify-center">
            <div className="w-full h-full max-w-sm bg-gray-50 rounded-lg flex items-center justify-center p-10">
              <Image
                src="/icon.png"
                alt="TerceiroGestor"
                width={240}
                height={240}
                priority
                className="h-auto w-60 object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
