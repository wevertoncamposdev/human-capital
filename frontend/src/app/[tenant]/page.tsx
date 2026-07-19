"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { withTenantPath } from "@/lib/tenant-path";

export default function TenantRootPage() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params?.tenant === "string" ? params.tenant : "";

  useEffect(() => {
    if (!slug) return;
    router.replace(withTenantPath("/dashboard", slug));
  }, [router, slug]);

  return (
    <div className="px-4 py-6 text-sm text-muted-foreground">
      Redirecionando...
    </div>
  );
}
