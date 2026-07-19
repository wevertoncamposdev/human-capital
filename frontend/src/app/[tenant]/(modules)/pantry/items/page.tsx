import { redirect } from "next/navigation";
import { withTenantPath } from "@/lib/tenant-path";

export default async function PantryItemsPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  redirect(withTenantPath("/pantry/stock", tenant));
}
