import type { ApiPersonSummary } from "./people";

export type ApiHouseholdInfo = {
  id: string;
  name?: string | null;
};

export type ApiHouseholdMember = {
  id: string;
  personId: string;
  role?: string | null;
  isLegalGuardian: boolean;
  isIncomeContributor: boolean;
  isProvider: boolean;
  isDependent: boolean;
  notes?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  person: ApiPersonSummary;
};

export type ApiPersonRelation = {
  id: string;
  personId: string;
  relatedPersonId: string;
  type: string;
  livesTogether: boolean;
  isLegalGuardian: boolean;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  relatedPerson: ApiPersonSummary;
};

export type ApiPersonTreeNode = {
  id: string;
  fullName: string;
  socialName?: string | null;
  birthDate: string | null;
  avatarUrl: string | null;
  sex?: string | null;
  gender?: string | null;
  raceColor?: string | null;
  status?: string | null;
  personType?: string | null;
  hasHealthCondition?: boolean | null;
  hasMedication?: boolean | null;
  depth: number;
};

export type ApiPersonTreeEdge = {
  id: string;
  fromId: string;
  toId: string;
  type: string;
};

export type ApiPersonRelationsTreeResponse = {
  rootId: string;
  depth: number;
  truncated: boolean;
  nodes: ApiPersonTreeNode[];
  edges: ApiPersonTreeEdge[];
};

export type ApiPersonRelationsResponse = {
  household?: ApiHouseholdInfo | null;
  householdMembers: ApiHouseholdMember[];
  relations: ApiPersonRelation[];
  relatedHouseholds?: {
    householdId: string;
    householdName?: string | null;
    personId: string;
    personName: string;
    relationType?: string | null;
    livesTogether: boolean;
  }[];
};

export type PersonRelationInput = {
  relatedPersonId: string;
  type: string;
  livesTogether?: boolean;
  isLegalGuardian?: boolean;
  notes?: string | null;
  householdRole?: string | null;
  isIncomeContributor?: boolean;
  isProvider?: boolean;
  isDependent?: boolean;
};

