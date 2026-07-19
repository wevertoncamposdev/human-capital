import { redirect } from "next/navigation";
import { withTenantPath } from "@/lib/tenant-path";

export default function LegacyGroupListPage({
  params,
}: {
  params: { tenant: string };
}) {
  redirect(withTenantPath("/projects/groups", params.tenant));
}
