import { redirect } from "next/navigation";
import { withTenantPath } from "@/lib/tenant-path";

export default async function DepositItemsPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  redirect(withTenantPath("/Deposit/stock", tenant));
}
