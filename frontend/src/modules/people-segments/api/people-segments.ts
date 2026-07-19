import type {
  ApiPeopleGroup,
  ApiPeopleGroupParticipation,
} from "@/modules/people-groups/api";
import {
  createPeopleGroup,
  createPeopleGroupParticipation,
  deletePeopleGroup,
  endPeopleGroupParticipation,
  getPeopleGroup,
  listPeopleGroupParticipations,
  listPeopleGroups,
  updatePeopleGroup,
} from "@/modules/people-groups/api";
import type {
  ApiPeopleSegment,
  ApiPeopleSegmentMembership,
  CreatePeopleSegmentMembershipInput,
  EndPeopleSegmentMembershipInput,
  PeopleSegmentInput,
  PeopleSegmentMembershipsListResponse,
  PeopleSegmentsListResponse,
} from "./types";

function mapPeopleGroup(group: ApiPeopleGroup): ApiPeopleSegment {
  return {
    id: group.id,
    tenantId: group.tenantId,
    name: group.name,
    groupType: group.groupType,
    purpose: group.purpose,
    category: group.category,
    description: group.description,
    ageMin: group.ageMin,
    ageMax: group.ageMax,
    isActive: group.isActive,
    internalNotes: group.internalNotes,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    _count: {
      memberships: group._count?.participations ?? 0,
    },
  };
}

function mapPeopleGroupParticipation(
  participation: ApiPeopleGroupParticipation,
): ApiPeopleSegmentMembership {
  return {
    id: participation.id,
    tenantId: participation.tenantId,
    segmentId: participation.peopleGroupId,
    personId: participation.personId,
    activeKey: participation.activeKey,
    isActive: participation.isActive,
    startsAt: participation.startsAt,
    endsAt: participation.endsAt,
    deletedAt: participation.deletedAt,
    internalNotes: participation.internalNotes,
    createdAt: participation.createdAt,
    updatedAt: participation.updatedAt,
    person: participation.person,
  };
}

function inferGroupType(
  input: Partial<PeopleSegmentInput>,
): NonNullable<PeopleSegmentInput["groupType"]> {
  if (input.groupType) return input.groupType;
  if (input.purpose === "EQUIPE") return "TEAM_POOL";
  const category = input.category?.trim().toLocaleLowerCase();
  if (!category) return "SEGMENT";
  if (category.includes("ciclo")) return "CYCLE";
  if (category.includes("equipe")) return "TEAM_POOL";
  if (category.includes("rede") || category.includes("parceir")) return "NETWORK";
  return "SEGMENT";
}

export async function listPeopleSegments(
  token: string,
  params?: {
    q?: string;
    category?: string;
    isActive?: boolean;
    ageMin?: number;
    ageMax?: number;
    page?: number;
    limit?: number;
    all?: boolean;
  },
) {
  const response = await listPeopleGroups(token, params);
  return {
    ...response,
    data: response.data.map(mapPeopleGroup),
  } satisfies PeopleSegmentsListResponse;
}

export async function getPeopleSegment(token: string, id: string) {
  return mapPeopleGroup(await getPeopleGroup(token, id));
}

export async function createPeopleSegment(token: string, payload: PeopleSegmentInput) {
  return mapPeopleGroup(
    await createPeopleGroup(token, {
      ...payload,
      purpose: payload.purpose,
      groupType: inferGroupType(payload),
    }),
  );
}

export async function updatePeopleSegment(
  token: string,
  id: string,
  payload: Partial<PeopleSegmentInput>,
) {
  return mapPeopleGroup(
    await updatePeopleGroup(token, id, {
      ...payload,
      purpose: payload.purpose,
      ...(payload.groupType || payload.category
        ? { groupType: inferGroupType(payload) }
        : {}),
    }),
  );
}

export async function deletePeopleSegment(token: string, id: string) {
  return deletePeopleGroup(token, id);
}

export async function listPeopleSegmentMemberships(
  token: string,
  segmentId: string,
  params?: {
    q?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
    all?: boolean;
  },
) {
  const response = await listPeopleGroupParticipations(token, segmentId, params);
  return {
    ...response,
    data: response.data.map(mapPeopleGroupParticipation),
  } satisfies PeopleSegmentMembershipsListResponse;
}

export async function createPeopleSegmentMembership(
  token: string,
  segmentId: string,
  payload: CreatePeopleSegmentMembershipInput,
) {
  return mapPeopleGroupParticipation(
    await createPeopleGroupParticipation(token, segmentId, payload),
  );
}

export async function endPeopleSegmentMembership(
  token: string,
  segmentId: string,
  membershipId: string,
  payload?: EndPeopleSegmentMembershipInput,
) {
  return mapPeopleGroupParticipation(
    await endPeopleGroupParticipation(token, segmentId, membershipId, payload),
  );
}
