"use client";

import { useParams } from "next/navigation";
import * as React from "react";
import { LoginForm } from "@/modules/core/features/auth/ui/login-form";

export default function TenantLoginPage() {
  const params = useParams();
  const slug = typeof params?.tenant === "string" ? params.tenant : "";
  return (
    <React.Suspense
      fallback={
        <div className="min-h-[calc(100vh-64px)] px-4 py-10 flex items-center justify-center text-sm text-muted-foreground">
          Carregando...
        </div>
      }
    >
      <LoginForm tenantSlug={slug} />
    </React.Suspense>
  );
}
