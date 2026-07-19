import type { Metadata } from "next";
import { fetchTenantPreviewBySlug } from "@/lib/server/tenant-preview";

const FAVICON_VERSION = "1";

export async function generateMetadata(props: {
  params: Promise<{ tenant: string }>;
}): Promise<Metadata> {
  const { tenant: tenantSlug } = await props.params;
  const tenant = await fetchTenantPreviewBySlug(tenantSlug);
  const tenantName = tenant?.name?.trim() || "Terceiro Gestor";

  return {
    title: {
      default: tenantName,
      template: `%s | ${tenantName}`,
    },
    manifest: "/manifest.webmanifest",
    icons: {
      icon: `/${encodeURIComponent(tenantSlug)}/favicon.ico?v=${FAVICON_VERSION}`,
    },
  };
}

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
