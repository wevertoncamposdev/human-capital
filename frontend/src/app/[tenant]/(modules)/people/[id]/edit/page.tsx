import { redirect } from "next/navigation";
import { withTenantPath } from "@/lib/tenant-path";

export default async function PeopleEditLegacyPage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant, id } = await params;
  redirect(withTenantPath(`/people/${id}`, tenant));
}
