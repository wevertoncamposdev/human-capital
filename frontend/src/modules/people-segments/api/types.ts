import type { ApiPerson } from "@/modules/people/api";

export type ApiPeopleSegment = {
  id: string;
  tenantId: string;
  name: string;
  groupType?: "CYCLE" | "SEGMENT" | "TEAM_POOL" | "NETWORK" | "OTHER";
  purpose?: "PUBLICO" | "EQUIPE";
  category: string | null;
  description: string | null;
  ageMin: number | null;
  ageMax: number | null;
  isActive: boolean;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    memberships?: number;
  };
};

export type PeopleSegmentInput = {
  name: string;
  groupType?: ApiPeopleSegment["groupType"];
  purpose?: ApiPeopleSegment["purpose"];
  category?: string | null;
  description?: string | null;
  ageMin?: number | null;
  ageMax?: number | null;
  isActive?: boolean;
  internalNotes?: string | null;
};

export type ApiPeopleSegmentMembership = {
  id: string;
  tenantId: string;
  segmentId: string;
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

export type CreatePeopleSegmentMembershipInput = {
  personId: string;
  startsAt?: string;
  internalNotes?: string | null;
};

export type EndPeopleSegmentMembershipInput = {
  endsAt?: string;
  internalNotes?: string | null;
};

export type PeopleSegmentsListResponse = {
  data: ApiPeopleSegment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export type PeopleSegmentMembershipsListResponse = {
  data: ApiPeopleSegmentMembership[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};
