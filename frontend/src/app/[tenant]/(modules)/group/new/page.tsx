import { redirect } from "next/navigation";
import { withTenantPath } from "@/lib/tenant-path";

export default function LegacyGroupCreatePage({
  params,
}: {
  params: { tenant: string };
}) {
  redirect(withTenantPath("/projects/groups/new", params.tenant));
}
