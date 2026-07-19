"use client";

import type { ApiProjectEnrollment } from "@/modules/projects/api";

export type ApiActionType = {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  target: "PROJECT" | "PROJECT_GROUP" | "PEOPLE_GROUP" | "ENROLLMENT";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ActionStatus = "PLANNED" | "EXECUTED" | "CANCELED";

export type ApiProjectAction = {
  id: string;
  tenantId: string;
  projectId: string;
  createdByUserId: string | null;
  projectGroupId: string | null;
  peopleGroupId: string | null;
  targetEnrollmentId: string | null;
  actionTypeId: string;
  title: string;
  description: string | null;
  tags: string[];
  internalNotes: string | null;
  planHtml: string | null;
  executedHtml: string | null;
  conclusionHtml: string | null;
  completionPercent: number | null;
  photoPaths: string[] | null;
  status: ActionStatus;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  executedStartAt: string | null;
  executedEndAt: string | null;
  createdAt: string;
  updatedAt: string;
  comments: ApiProjectActionComment[];
  attachments: ApiProjectActionAttachment[];
  project?: { id: string; name: string };
  actionType?: {
    id: string;
    name: string;
    target?: "PROJECT" | "PROJECT_GROUP" | "PEOPLE_GROUP" | "ENROLLMENT";
  };
  createdByUser?: { id: string; name: string | null; email: string };
  projectGroup?: { id: string; name: string } | null;
  peopleGroup?:
    | {
        id: string;
        name: string;
        category?: string | null;
        description?: string | null;
        ageMin?: number | null;
        ageMax?: number | null;
        isActive?: boolean;
        segmentId?: string | null;
        segment?: {
          id: string;
          name: string;
          category?: string | null;
        } | null;
        catalogCycleId?: string | null;
        catalogCycle?: {
          id: string;
          name: string;
          audienceType?: string | null;
        } | null;
      }
    | null;
  targetEnrollment?: ApiProjectEnrollment | null;
};

export type ApiProjectActionComment = {
  id: string;
  body: string;
  mentionUserIds: string[];
  author: {
    id: string | null;
    name: string;
    email?: string | null;
    avatarUrl?: string | null;
  };
  createdAt: string;
  updatedAt: string;
};

export type ApiProjectActionAttachment = {
  id: string;
  label: string;
  filePath: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
  uploadedBy: {
    id: string | null;
    name: string;
    email?: string | null;
    avatarUrl?: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type ProjectActionsListResponse = {
  data: ApiProjectAction[];
  pagination: PaginationMeta;
};

export type ProjectActionInput = {
  actionTypeId: string;
  title: string;
  description?: string | null;
  tags?: string[];
  internalNotes?: string | null;
  planHtml?: string | null;
  executedHtml?: string | null;
  conclusionHtml?: string | null;
  completionPercent?: number | null;
  photoPaths?: string[] | null;
  status?: ActionStatus;
  projectGroupId?: string | null;
  peopleGroupId?: string | null;
  targetEnrollmentId?: string | null;
  plannedStartAt?: string | null;
  plannedEndAt?: string | null;
  executedStartAt?: string | null;
  executedEndAt?: string | null;
};

export type ProjectActionCommentInput = {
  body: string;
  mentionUserIds?: string[];
};

export type ProjectActionAttachmentInput = {
  label: string;
  filePath: string;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
};

export type AttendanceStatus = "PRESENT" | "ABSENT" | "EXCUSED";
export type ActionPeopleParticipationRole =
  | "PARTICIPANTE"
  | "FACILITADOR"
  | "APOIO"
  | "VOLUNTARIO"
  | "RESPONSAVEL_TECNICO"
  | "CONVIDADO";

export type ApiProjectActionAttendance = {
  id: string;
  enrollmentId: string;
  status: AttendanceStatus;
  notes: string | null;
  qualityScore: number | null;
  qualityNotes: string | null;
  isHighlight: boolean;
  updatedAt: string;
};

export type ProjectActionAttendancesListItem = {
  enrollment: import("@/modules/projects/api").ApiProjectEnrollment;
  attendance: ApiProjectActionAttendance | null;
};

export type ProjectActionAttendancesListResponse = {
  action: {
    id: string;
    title: string;
    peopleGroupId: string | null;
    projectGroupId?: string | null;
    targetEnrollmentId?: string | null;
  };
  data: ProjectActionAttendancesListItem[];
  pagination: PaginationMeta;
};

export type ApiProjectActionPeopleParticipation = {
  id: string;
  tenantId: string;
  actionId: string;
  personId: string;
  enrollmentId: string | null;
  role: ActionPeopleParticipationRole;
  activeKey: string | null;
  isActive: boolean;
  startsAt: string;
  endsAt: string | null;
  deletedAt: string | null;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
  person: {
    id: string;
    fullName: string;
    socialName?: string | null;
    birthDate: string | null;
    status: string | null;
    avatarUrl: string | null;
    sex?: string | null;
    gender?: string | null;
    raceColor?: string | null;
    hasHealthCondition?: boolean | null;
    hasMedication?: boolean | null;
  };
  enrollment: ApiProjectEnrollment | null;
};

export type ProjectActionPeopleParticipationsListResponse = {
  data: ApiProjectActionPeopleParticipation[];
  pagination: PaginationMeta;
};

export type ActionPeopleParticipationInput = {
  personId: string;
  enrollmentId?: string | null;
  role?: ActionPeopleParticipationRole;
  startsAt?: string | null;
  internalNotes?: string | null;
};

export type EndActionPeopleParticipationInput = {
  endsAt?: string | null;
  internalNotes?: string | null;
};
