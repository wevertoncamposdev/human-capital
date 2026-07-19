"use client";

import * as React from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";

export function ProjectActionsManageRouteClientPage() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const projectId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  React.useEffect(() => {
    if (!projectId || !tenantSlug) return;
    router.replace(withTenantPath(`/projects/${projectId}`, tenantSlug));
  }, [projectId, router, tenantSlug]);

  return <div className="px-4 py-6 text-sm text-muted-foreground">Redirecionando...</div>;
}
