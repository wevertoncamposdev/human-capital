"use client";

import { useFamilyRelationsContext } from "@/modules/people/features/family-members/context/family-relations-context";
import { FamilyRelationsList } from "@/modules/people/features/family-members/ui/family-relations-list";
export function FamilyRelationsSection({ personId }: { personId: string }) {
  const {
    data,
    detailedLoading,
    detailedError,
    peopleOptions,
    incomeSummary,
    refresh,
    create,
    update,
    remove,
  } = useFamilyRelationsContext();
  const incomeContributorIds = incomeSummary?.contributors ?? [];

  return (
    <div>
      <FamilyRelationsList
        peopleOptions={peopleOptions}
        relations={data?.relations ?? []}
        householdMembers={data?.householdMembers ?? []}
        incomeContributorIds={incomeContributorIds}
        isLoading={detailedLoading}
        error={detailedError}
        currentPersonId={personId}
        onRefresh={refresh}
        onCreate={create}
        onUpdate={update}
        onDelete={remove}
        incomeSummary={incomeSummary}
      />
    </div>
  );
}

