"use client";

import * as React from "react";
import type { Person } from "../domain/types";
import { TabsContent } from "@/components/ui/tabs";
import { FamilyRelationsPanel } from "@/modules/people/features/family-members/ui/family-relations-panel";
import { PeopleFinancialRelationsPanel } from "@/modules/people/features/people-financial/ui/people-financial-relations-panel";
import { HealthConditionsPanel } from "@/modules/people/features/health-conditions/ui/health-conditions-panel";
import { MedicationsPanel } from "@/modules/people/features/medications/ui/medications-panel";
import { EducationPanel } from "@/modules/people/features/education/ui/education-panel";
import { DetentionsPanel } from "@/modules/people/features/detentions/ui/detentions-panel";

type PeopleDetailContentProps = {
  person: Person;
};

export function PeopleDetailContent({ person }: PeopleDetailContentProps) {
  return (
    <div className="flex-1 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <TabsContent value="familia" className="space-y-6">
        <FamilyRelationsPanel personId={person.id} />
      </TabsContent>

      <TabsContent value="financeiro" className="space-y-6">
        <PeopleFinancialRelationsPanel personId={person.id} />
      </TabsContent>

      <TabsContent value="saude" className="space-y-6">
        <HealthConditionsPanel personId={person.id} />
      </TabsContent>

      <TabsContent value="medicacoes" className="space-y-6">
        <MedicationsPanel personId={person.id} />
      </TabsContent>

      <TabsContent value="escolaridade" className="space-y-6">
        <EducationPanel personId={person.id} />
      </TabsContent>
      <TabsContent value="reclusao" className="space-y-6">
        <DetentionsPanel personId={person.id} />
      </TabsContent>
    </div>
  );
}

