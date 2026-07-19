import { redirect } from "next/navigation";
import { withTenantPath } from "@/lib/tenant-path";

export default function LegacyGroupDetailPage({
  params,
  searchParams,
}: {
  params: { tenant: string; id: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const id = encodeURIComponent(params.id);
  const query = new URLSearchParams();

  const returnTo = searchParams?.returnTo;
  if (typeof returnTo === "string" && returnTo.trim()) {
    query.set("returnTo", returnTo);
  }

  const queryString = query.toString();
  redirect(
    withTenantPath(
      `/projects/groups/${id}${queryString ? `?${queryString}` : ""}`,
      params.tenant,
    ),
  );
}
