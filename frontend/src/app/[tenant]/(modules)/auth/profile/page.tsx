"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";

export default function LegacyProfilePage() {
  const router = useRouter();
  const pathname = usePathname();
  const slug = getTenantSlugFromPath(pathname);

  React.useEffect(() => {
    router.replace(withTenantPath("/dashboard/profile", slug));
  }, [router, slug]);

  return (
    <div className="px-4 py-6 text-sm text-muted-foreground">
      Redirecionando...
    </div>
  );
}

