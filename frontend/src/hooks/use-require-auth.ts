"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import {
  getTenantSlugFromPath,
  readStoredTenantSlug,
  withTenantPath,
} from "@/lib/tenant-path";

export function useRequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      const tenantSlug =
        getTenantSlugFromPath(pathname) ?? readStoredTenantSlug();
      const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`${withTenantPath("/login", tenantSlug)}${next}`);
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  return { isAuthenticated, isLoading };
}
