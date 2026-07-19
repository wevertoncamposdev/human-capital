import { redirect } from "next/navigation";

export default async function PeopleSegmentsPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  redirect(`/${tenant}/people-groups`);
}
