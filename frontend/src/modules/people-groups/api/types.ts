import type { ApiPerson } from "@/modules/people/api";

export type ApiPeopleGroup = {
  id: string;
  tenantId: string;
  name: string;
  groupType: "CYCLE" | "SEGMENT" | "TEAM_POOL" | "NETWORK" | "OTHER";
  purpose: "PUBLICO" | "EQUIPE";
  category: string | null;
  description: string | null;
  ageMin: number | null;
  ageMax: number | null;
  isActive: boolean;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    participations?: number;
  };
};

export type PeopleGroupInput = {
  name: string;
  groupType?: ApiPeopleGroup["groupType"];
  purpose?: ApiPeopleGroup["purpose"];
  category?: string | null;
  description?: string | null;
  ageMin?: number | null;
  ageMax?: number | null;
  isActive?: boolean;
  internalNotes?: string | null;
};

export type ApiPeopleGroupParticipation = {
  id: string;
  tenantId: string;
  peopleGroupId: string;
  personId: string;
  activeKey: string | null;
  isActive: boolean;
  startsAt: string;
  endsAt: string | null;
  deletedAt: string | null;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
  person: ApiPerson;
};

export type CreatePeopleGroupParticipationInput = {
  personId: string;
  startsAt?: string;
  internalNotes?: string | null;
};

export type EndPeopleGroupParticipationInput = {
  endsAt?: string;
  internalNotes?: string | null;
};

export type PeopleGroupsListResponse = {
  data: ApiPeopleGroup[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type PeopleGroupParticipationsListResponse = {
  data: ApiPeopleGroupParticipation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};
