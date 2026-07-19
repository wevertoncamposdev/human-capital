import { redirect } from "next/navigation";
import { withTenantPath } from "@/lib/tenant-path";

export default async function PantryExitsPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  redirect(withTenantPath("/pantry/stock", tenant));
}
