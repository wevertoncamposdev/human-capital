import { redirect } from "next/navigation";

export default async function PeopleSegmentsDetailRoutePage({
  params,
}: {
  params: Promise<{ tenant: string; id: string }>;
}) {
  const { tenant, id } = await params;
  redirect(`/${tenant}/people-groups/${id}`);
}
