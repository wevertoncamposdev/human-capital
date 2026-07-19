"use client";

import { resolvePersonDisplayNames } from "@/modules/people/shared/domain/utils";
import {
  FamilyPreview,
  type FamilyPreviewMember,
} from "@/modules/people/features/family-members/ui/family-preview";
import { useFamilyRelationsContext } from "@/modules/people/features/family-members/context/family-relations-context";

export function FamilyHeaderPreview() {
  const { data, summary, summaryLoading, detailedLoading } =
    useFamilyRelationsContext();

  if (detailedLoading) {
    return (
      <p className="text-xs text-muted-foreground">Carregando familiares...</p>
    );
  }

  const householdMembers = data?.householdMembers ?? [];
  if (!householdMembers.length) {
    const relationsSummary = summary?.relations;
    if (summaryLoading) {
      return (
        <p className="text-xs text-muted-foreground">
          Carregando resumo familiar...
        </p>
      );
    }
    if (!relationsSummary) {
      return (
        <p className="text-xs text-muted-foreground">
          Sem resumo familiar disponível.
        </p>
      );
    }
    if (relationsSummary.totalRelations + relationsSummary.livingCount === 0) {
      return (
        <p className="text-xs text-muted-foreground">
          Nenhum vínculo familiar registrado.
        </p>
      );
    }
    return (
      <p className="text-xs text-muted-foreground">
        Moram juntos: {relationsSummary.livingCount} • Fora da residência:{" "}
        {relationsSummary.externalCount}
      </p>
    );
  }
  const relationByPerson = new Map(
    (data?.relations ?? []).map((relation) => [
      relation.relatedPersonId,
      relation.type,
    ]),
  );
  const members: FamilyPreviewMember[] = householdMembers.map((member) => ({
    id: member.person.id,
    name: resolvePersonDisplayNames(
      member.person.fullName,
      member.person.socialName,
    ).primary,
    fullName: member.person.fullName,
    socialName: member.person.socialName ?? null,
    birthDate: member.person.birthDate ?? null,
    role: relationByPerson.get(member.personId) ?? member.role ?? "Mora junto",
    avatarUrl: member.person.avatarUrl ?? null,
    hasHealthCondition: member.person.hasHealthCondition ?? null,
    hasMedication: member.person.hasMedication ?? null,
  }));

  return <FamilyPreview members={members} />;
}


