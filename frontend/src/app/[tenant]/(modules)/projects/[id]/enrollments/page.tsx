import { redirect } from "next/navigation";

export default async function ProjectEnrollmentsManagePage({
  params,
  searchParams,
}: {
  params: Promise<{ tenant: string; id: string }>;
  searchParams: Promise<{
    enrollmentId?: string;
    returnTo?: string;
  }>;
}) {
  const { tenant, id } = await params;
  const queryValues = await searchParams;
  const query = new URLSearchParams();

  if (typeof queryValues.enrollmentId === "string" && queryValues.enrollmentId.trim()) {
    query.set("enrollmentId", queryValues.enrollmentId);
  }

  if (typeof queryValues.returnTo === "string" && queryValues.returnTo.trim()) {
    query.set("returnTo", queryValues.returnTo);
  }

  const queryString = query.toString();
  redirect(`/${tenant}/projects/${id}${queryString ? `?${queryString}` : ""}`);
}
