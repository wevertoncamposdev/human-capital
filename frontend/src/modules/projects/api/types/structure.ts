import type { ProjectsPagination } from "./shared";

export type EnrollmentStatus = "ACTIVE" | "ENDED";
export type ProjectParticipationRole =
  | "PUBLICO_ATENDIDO"
  | "FAMILIAR"
  | "VOLUNTARIO"
  | "EQUIPE_TECNICA"
  | "FUNCIONARIO"
  | "OFICINEIRO"
  | "PARCEIRO"
  | "DOADOR"
  | "PATROCINADOR";

export type ParticipationKind = "PARTICIPANT" | "TEAM";

export type ApiProjectPeopleGroup = {
  id: string;
  tenantId: string;
  projectId: string;
  peopleGroupId: string;
  participationKind: ParticipationKind;
  createdAt: string;
  updatedAt: string;
  peopleGroup: {
    id: string;
    name: string;
    groupType?: "CYCLE" | "SEGMENT" | "TEAM_POOL" | "NETWORK" | "OTHER";
    category?: string | null;
    description?: string | null;
    ageMin?: number | null;
    ageMax?: number | null;
    isActive?: boolean;
  };
};

export type ApiProjectGroup = {
  id: string;
  tenantId: string;
  projectId: string;
  name: string;
  description: string | null;
  internalNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  project?: { id: string; name: string; programId?: string | null };
  _count?: { memberships: number; actions: number };
};

export type ApiEnrollmentPerson = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  birthDate: string | null;
  status: string | null;
  sex?: string | null;
  gender?: string | null;
  raceColor?: string | null;
  hasHealthCondition?: boolean | null;
  hasMedication?: boolean | null;
};

export type ApiEligibleProjectPerson = ApiEnrollmentPerson & {
  tenantId: string;
  socialName?: string | null;
  maritalStatus?: string | null;
  nationality?: string | null;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
  rg?: string | null;
  nis?: string | null;
  personType?: string | null;
  departureReason?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  profileSummary?: string | null;
  createdAt: string;
  updatedAt: string;
  eligiblePeopleGroups?: Array<{
    id: string;
    name: string;
    category?: string | null;
  }>;
  eligibleSegments?: Array<{
    id: string;
    name: string;
    category?: string | null;
  }>;
};

export type ApiProjectEnrollment = {
  id: string;
  tenantId: string;
  projectId: string;
  personId: string;
  status: EnrollmentStatus;
  role: ProjectParticipationRole;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
  person: ApiEnrollmentPerson;
  groups: { id: string; name: string }[];
  peopleGroups: { id: string; name: string; category?: string | null }[];
  groupMembershipHistory: Array<{
    id: string;
    isActive: boolean;
    startsAt: string | null;
    endsAt: string | null;
    deletedAt: string | null;
    group: { id: string; name: string };
  }>;
  cycle: { id: string; name: string } | null;
};

export type ProjectGroupInput = {
  name: string;
  description?: string | null;
  internalNotes?: string | null;
};

export type ProjectEnrollmentInput = {
  personId: string;
  status?: EnrollmentStatus;
  role?: ProjectParticipationRole;
  participationKind?: ParticipationKind;
  startsAt?: string | null;
  endsAt?: string | null;
};

export type ProjectPeopleGroupInput = {
  peopleGroupId: string;
  participationKind: ParticipationKind;
};

export type EnrollmentGroupInput = {
  groupId: string;
};

export type ProjectEnrollmentsListResponse = {
  data: ApiProjectEnrollment[];
  pagination: ProjectsPagination;
};

export type EligibleProjectPeopleListResponse = {
  data: ApiEligibleProjectPerson[];
  pagination: ProjectsPagination;
};

export type ProjectGroupsListResponse = {
  data: ApiProjectGroup[];
  pagination: ProjectsPagination;
};
