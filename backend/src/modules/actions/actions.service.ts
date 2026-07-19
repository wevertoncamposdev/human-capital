import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  ActionPeopleParticipationRole,
  ActionStatus,
  ActionTarget,
  AttendanceStatus,
  ParticipationKind,
  Prisma,
} from '../../generated/prisma';
import type { JwtUser } from '../../core/auth/strategies/jwt.strategy';
import { PrismaService } from '../../core/prisma/prisma.service';
import { parseDateInput } from '../../core/utils/dates';
import { buildPaginationMeta, resolvePagination } from '../../core/utils/pagination';
import { normalizeString } from '../../core/utils/strings';
import { buildPeopleWhere, parseAdvancedFilters } from '../people/people.filters';
import { CreateActionTypeDto } from './dto/create-action-type.dto';
import { CreateActionPeopleGroupDto } from './dto/create-action-people-group.dto';
import { CreateProjectActionPeopleParticipationDto } from './dto/create-project-action-people-participation.dto';
import { CreateProjectActionDto } from './dto/create-project-action.dto';
import { EndProjectActionPeopleParticipationDto } from './dto/end-project-action-people-participation.dto';
import { ListEligibleProjectActionPeopleQueryDto } from './dto/list-eligible-project-action-people-query.dto';
import { ListActionTypesQueryDto } from './dto/list-action-types-query.dto';
import { ListActionPeopleGroupsQueryDto } from './dto/list-action-people-groups-query.dto';
import { ListProjectActionAttendancesQueryDto } from './dto/list-project-action-attendances-query.dto';
import { ListProjectActionPeopleParticipationsQueryDto } from './dto/list-project-action-people-participations-query.dto';
import { ListProjectActionsQueryDto } from './dto/list-project-actions-query.dto';
import { UpdateActionTypeDto } from './dto/update-action-type.dto';
import { UpdateProjectActionDto } from './dto/update-project-action.dto';
import { UpsertProjectActionAttendancesDto } from './dto/upsert-project-action-attendances.dto';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;

function ensureValidPeriod(params: { startsAt?: Date | null; endsAt?: Date | null }) {
  const startsAt = params.startsAt ?? null;
  const endsAt = params.endsAt ?? null;
  if (startsAt && endsAt && startsAt > endsAt) {
    throw new BadRequestException('Periodo invalido: inicio maior que termino');
  }
}

function normalizeHtml(value: string | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizePhotoPaths(value: string[] | null | undefined) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const items = (value ?? [])
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter(Boolean);
  const unique = Array.from(new Set(items));
  return unique.length ? unique.slice(0, 5) : null;
}

function normalizeTags(tags?: string[] | null) {
  if (!tags) return null;
  const cleaned = Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
  return cleaned.length ? JSON.stringify(cleaned) : null;
}

function parseTags(value: string | null | undefined) {
  if (!value) return [] as string[];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map((tag) => String(tag ?? '').trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function parseMentionUserIds(value: Prisma.JsonValue | null | undefined) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((entry) => String(entry ?? '').trim()).filter(Boolean)));
}

function resolvePrimaryActionPeopleGroup(action: {
  peopleGroups?: Array<{
    peopleGroupId: string;
    participationKind?: ParticipationKind;
    peopleGroup?: {
      id: string;
      name: string;
      category?: string | null;
      description?: string | null;
      ageMin?: number | null;
      ageMax?: number | null;
      isActive?: boolean;
    } | null;
  }>;
}) {
  const rows = action.peopleGroups ?? [];
  return rows.find((row) => row.participationKind === 'PARTICIPANT') ?? rows[0] ?? null;
}

const mapCommentAuthor = (
  user:
    | {
        id: string;
        name: string | null;
        email: string | null;
        avatarUrl?: string | null;
      }
    | null
    | undefined,
) => ({
  id: user?.id ?? null,
  name: user?.name?.trim() || user?.email || 'Equipe interna',
  email: user?.email ?? null,
  avatarUrl: user?.avatarUrl ?? null,
});

const mapProjectActionCommentItem = (
  comment: {
    id: string;
    body: string;
    mentionUserIds: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
    authorUser?: {
      id: string;
      name: string | null;
      email: string | null;
      avatarUrl?: string | null;
    } | null;
  },
) => ({
  id: comment.id,
  body: comment.body,
  mentionUserIds: parseMentionUserIds(comment.mentionUserIds),
  author: mapCommentAuthor(comment.authorUser),
  createdAt: comment.createdAt,
  updatedAt: comment.updatedAt,
});

const mapProjectActionAttachmentItem = (
  attachment: {
    id: string;
    label: string;
    filePath: string;
    mimeType: string | null;
    fileSizeBytes: number | null;
    createdAt: Date;
    updatedAt: Date;
    uploadedByUser?: {
      id: string;
      name: string | null;
      email: string | null;
      avatarUrl?: string | null;
    } | null;
  },
) => ({
  id: attachment.id,
  label: attachment.label,
  filePath: attachment.filePath,
  mimeType: attachment.mimeType ?? null,
  fileSizeBytes: attachment.fileSizeBytes ?? null,
  uploadedBy: attachment.uploadedByUser
    ? {
        id: attachment.uploadedByUser.id,
        name:
          attachment.uploadedByUser.name?.trim() ||
          attachment.uploadedByUser.email ||
          'Equipe interna',
        email: attachment.uploadedByUser.email ?? null,
        avatarUrl: attachment.uploadedByUser.avatarUrl ?? null,
      }
    : null,
  createdAt: attachment.createdAt,
  updatedAt: attachment.updatedAt,
});

function serializeProjectAction(action: any) {
  const primaryPeopleGroup = resolvePrimaryActionPeopleGroup(action);
  return {
    ...action,
    projectGroupId: (action as any).groupId ?? null,
    peopleGroupId: primaryPeopleGroup?.peopleGroupId ?? null,
    tags: parseTags(action.tags),
    projectGroup: action.group ?? null,
    peopleGroup: primaryPeopleGroup?.peopleGroup ?? null,
    peopleGroups: undefined,
    comments: action.comments?.map(mapProjectActionCommentItem) ?? [],
    attachments: action.attachments?.map(mapProjectActionAttachmentItem) ?? [],
  };
}

function resolveScopeFromTarget(params: {
  target: ActionTarget;
  groupId: string | null;
  peopleGroupId: string | null;
  targetEnrollmentId: string | null;
}) {
  if (params.target === 'PROJECT_GROUP') {
    return {
      groupId: params.groupId,
      peopleGroupId: null as string | null,
      targetEnrollmentId: null as string | null,
    };
  }
  if (params.target === 'PEOPLE_GROUP') {
    return {
      groupId: null as string | null,
      peopleGroupId: params.peopleGroupId,
      targetEnrollmentId: null as string | null,
    };
  }
  if (params.target === 'ENROLLMENT') {
    return {
      groupId: null as string | null,
      peopleGroupId: null as string | null,
      targetEnrollmentId: params.targetEnrollmentId,
    };
  }
  return {
    groupId: null as string | null,
    peopleGroupId: null as string | null,
    targetEnrollmentId: null as string | null,
  };
}

const projectActionInclude = {
  project: { select: { id: true, name: true } },
  actionType: { select: { id: true, name: true, target: true } },
  createdByUser: { select: { id: true, name: true, email: true } },
  group: { select: { id: true, name: true } },
  peopleGroups: {
    where: { participationKind: 'PARTICIPANT' },
    include: {
      peopleGroup: {
        select: {
          id: true,
          name: true,
          category: true,
          description: true,
          ageMin: true,
          ageMax: true,
          isActive: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  },
  targetEnrollment: {
    include: {
      person: {
        select: {
          id: true,
          fullName: true,
          socialName: true,
          birthDate: true,
          status: true,
          avatarUrl: true,
          peopleGroupParticipations: {
            where: { isActive: true, deletedAt: null },
            select: {
              peopleGroup: {
                select: {
                  id: true,
                  name: true,
                  category: true,
                },
              },
            },
          },
        },
      },
      groupMemberships: {
        where: { isActive: true, deletedAt: null },
        include: { group: { select: { id: true, name: true } } },
      },
    },
  },
} satisfies Prisma.ProjectActionInclude;

function buildProjectActionWhere(params: {
  tenantId: string;
  userId: string;
  canReadAll: boolean;
  query: ListProjectActionsQueryDto;
  projectId?: string | null;
}) {
  const { tenantId, userId, canReadAll, query } = params;
  const q = normalizeString(query.q);
  const effectiveMine = canReadAll ? (query.mine ?? false) : true;
  const resolvedProjectId = params.projectId ?? query.projectId ?? null;
  const scopedPeopleGroupId = query.peopleGroupId ?? null;
  const and: Prisma.ProjectActionWhereInput[] = [];

  if (query.actionTypeId) {
    and.push({ actionTypeId: query.actionTypeId });
  }
  if (query.groupId) {
    and.push({ groupId: query.groupId });
  }
  if (scopedPeopleGroupId) {
    and.push({
      peopleGroups: {
        some: {
          participationKind: 'PARTICIPANT',
          peopleGroupId: scopedPeopleGroupId,
        },
      },
    });
  }
  if (q) {
    and.push({
      OR: [
        { title: { contains: q } },
        { tags: { contains: q } },
        { internalNotes: { contains: q } },
        { actionType: { name: { contains: q } } },
        { project: { name: { contains: q } } },
        { group: { name: { contains: q } } },
        { peopleGroups: { some: { peopleGroup: { name: { contains: q } } } } },
        { peopleGroups: { some: { peopleGroup: { category: { contains: q } } } } },
      ],
    });
  }

  return {
    tenantId,
    ...(resolvedProjectId ? { projectId: resolvedProjectId } : {}),
    ...(effectiveMine ? { createdByUserId: userId } : {}),
    ...(query.status ? { status: query.status as ActionStatus } : {}),
    ...(and.length ? { AND: and } : {}),
  } satisfies Prisma.ProjectActionWhereInput;
}

@Injectable()
export class ActionsService {
  constructor(private readonly prisma: PrismaService) {}

  private async hasPermission(tenantId: string, userId: string, key: string) {
    const row = await this.prisma.rolePermission.findFirst({
      where: {
        tenantId,
        permission: { key },
        role: { users: { some: { userId } } },
      },
      select: { id: true },
    });
    return Boolean(row);
  }

  private async ensureProjectExists(tenantId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Projeto nao encontrado');
  }

  private async ensureProjectGroupBelongsToProject(
    tenantId: string,
    projectId: string,
    projectGroupId: string,
  ) {
    const projectGroup = await this.prisma.projectGroup.findFirst({
      where: { id: projectGroupId, tenantId, projectId },
      select: { id: true },
    });
    if (!projectGroup) throw new BadRequestException('Grupo de participantes invalido');
  }

  private async ensurePeopleGroupBelongsToProject(
    tenantId: string,
    projectId: string,
    peopleGroupId: string,
    participationKind: ParticipationKind = 'PARTICIPANT',
  ) {
    const peopleGroupLink = await this.prisma.projectPeopleGroup.findFirst({
      where: { tenantId, projectId, peopleGroupId, participationKind },
      select: { id: true },
    });
    if (!peopleGroupLink) throw new BadRequestException('Grupo de pessoas invalido');
  }

  private async ensureEnrollmentBelongsToProject(
    tenantId: string,
    projectId: string,
    enrollmentId: string,
  ) {
    const enrollment = await this.prisma.projectEnrollment.findFirst({
      where: { id: enrollmentId, tenantId, projectId, deletedAt: null },
      select: { id: true },
    });
    if (!enrollment) throw new BadRequestException('Participante invalido');
  }

  private serializeEnrollment<T extends { groupMemberships?: any[] }>(enrollment: T) {
    const groups = (enrollment.groupMemberships ?? []).map((m) => m.group);
    const person = (enrollment as any).person;
    const peopleGroups = (person?.peopleGroupParticipations ?? [])
      .map((participation: { peopleGroup?: unknown }) => participation.peopleGroup)
      .filter((peopleGroup: unknown) => Boolean(peopleGroup));
    const withPersonFlags =
      person && person._count
        ? {
            ...person,
            hasHealthCondition: (person._count.healthConditions ?? 0) > 0,
            hasMedication: (person._count.medications ?? 0) > 0,
            _count: undefined,
            peopleGroupParticipations: undefined,
          }
        : person;
    return {
      ...enrollment,
      ...(person ? { person: withPersonFlags } : {}),
      groups,
      cycle: null,
      peopleGroups,
      groupMemberships: undefined,
    };
  }

  private async ensureProjectActionExists(user: JwtUser, projectId: string, actionId: string) {
    const canReadAll = await this.hasPermission(
      user.tenantId,
      user.userId,
      'actions.manage',
    );
    const action = await this.prisma.projectAction.findFirst({
      where: { id: actionId, tenantId: user.tenantId, projectId },
      include: {
        actionType: { select: { id: true, name: true, target: true } },
        createdByUser: { select: { id: true, name: true, email: true } },
        group: { select: { id: true, name: true } },
        peopleGroups: {
          where: { participationKind: 'PARTICIPANT' },
          include: {
            peopleGroup: {
              select: {
                id: true,
                name: true,
                category: true,
                description: true,
                ageMin: true,
                ageMax: true,
                isActive: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        targetEnrollment: {
          include: {
            person: {
              select: {
                id: true,
                fullName: true,
                socialName: true,
                birthDate: true,
                status: true,
                avatarUrl: true,
                peopleGroupParticipations: {
                  where: { isActive: true, deletedAt: null },
                  select: {
                    peopleGroup: {
                      select: {
                        id: true,
                        name: true,
                        category: true,
                      },
                    },
                  },
                },
              },
            },
            groupMemberships: {
              where: { isActive: true, deletedAt: null },
              include: { group: { select: { id: true, name: true } } },
            },
          },
        },
        comments: {
          orderBy: { createdAt: 'desc' },
          include: {
            authorUser: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        attachments: {
          orderBy: { createdAt: 'desc' },
          include: {
            uploadedByUser: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
      },
    });
    if (!action) throw new NotFoundException('Acao nao encontrada');
    if (!canReadAll && action.createdByUserId !== user.userId) {
      throw new ForbiddenException('Permissao negada');
    }
    return serializeProjectAction(action);
  }

  private async syncParticipantPeopleGroupScope(params: {
    tenantId: string;
    projectId: string;
    actionId: string;
    peopleGroupId: string | null;
  }) {
    await this.prisma.actionPeopleGroup.deleteMany({
      where: {
        tenantId: params.tenantId,
        actionId: params.actionId,
        participationKind: 'PARTICIPANT',
      },
    });

    if (!params.peopleGroupId) {
      return;
    }

    await this.ensurePeopleGroupBelongsToProject(
      params.tenantId,
      params.projectId,
      params.peopleGroupId,
      'PARTICIPANT',
    );

    await this.prisma.actionPeopleGroup.create({
      data: {
        tenantId: params.tenantId,
        actionId: params.actionId,
        peopleGroupId: params.peopleGroupId,
        participationKind: 'PARTICIPANT',
      },
    });
  }

  async listActionTypes(tenantId: string, query: ListActionTypesQueryDto) {
    const q = normalizeString(query.q);
    return this.prisma.actionType.findMany({
      where: {
        tenantId,
        ...(query.isActiveValue === undefined ? {} : { isActive: query.isActiveValue }),
        ...(q ? { name: { contains: q } } : {}),
      },
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  async createActionType(tenantId: string, dto: CreateActionTypeDto) {
    const name = (dto.name ?? '').trim();
    if (!name) throw new BadRequestException('Nome e obrigatorio');
    return this.prisma.actionType.create({
      data: {
        tenantId,
        name,
        description: dto.description?.trim() ? dto.description.trim() : null,
        target: dto.target ?? 'PROJECT',
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateActionType(tenantId: string, id: string, dto: UpdateActionTypeDto) {
    const existing = await this.prisma.actionType.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Tipo de acao nao encontrado');

    const name = dto.name !== undefined ? (dto.name ?? '').trim() : undefined;
    if (name !== undefined && !name) throw new BadRequestException('Nome e obrigatorio');

    return this.prisma.actionType.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() ? dto.description.trim() : null }
          : {}),
        ...(dto.target !== undefined ? { target: dto.target } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async deleteActionType(tenantId: string, id: string) {
    const existing = await this.prisma.actionType.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Tipo de acao nao encontrado');

    const usage = await this.prisma.projectAction.count({
      where: { tenantId, actionTypeId: existing.id },
    });
    if (usage > 0) {
      throw new BadRequestException('Nao e possivel excluir: tipo ja utilizado em acoes');
    }

    await this.prisma.actionType.delete({ where: { id: existing.id } });
    return { ok: true as const };
  }

  async listProjectActions(user: JwtUser, projectId: string, query: ListProjectActionsQueryDto) {
    await this.ensureProjectExists(user.tenantId, projectId);
    const canReadAll = await this.hasPermission(
      user.tenantId,
      user.userId,
      'actions.manage',
    );

    const { page, limit, skip, take } = resolvePagination({
      page: query.page,
      limit: query.limit,
      all: false,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    });

    const where = buildProjectActionWhere({
      tenantId: user.tenantId,
      userId: user.userId,
      canReadAll,
      query,
      projectId,
    });

    const [data, total] = await Promise.all([
      this.prisma.projectAction.findMany({
        where,
        include: projectActionInclude,
        orderBy: [{ plannedStartAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.projectAction.count({ where }),
    ]);

    return {
      data: data.map((item) => serializeProjectAction(item)),
      pagination: buildPaginationMeta({ page, limit, total, isAll: false }),
    };
  }

  async listActions(user: JwtUser, query: ListProjectActionsQueryDto) {
    const canReadAll = await this.hasPermission(
      user.tenantId,
      user.userId,
      'actions.manage',
    );

    const { page, limit, skip, take } = resolvePagination({
      page: query.page,
      limit: query.limit,
      all: false,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    });

    const where = buildProjectActionWhere({
      tenantId: user.tenantId,
      userId: user.userId,
      canReadAll,
      query,
    });

    const [data, total] = await Promise.all([
      this.prisma.projectAction.findMany({
        where,
        include: projectActionInclude,
        orderBy: [{ plannedStartAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.projectAction.count({ where }),
    ]);

    return {
      data: data.map((item) => serializeProjectAction(item)),
      pagination: buildPaginationMeta({ page, limit, total, isAll: false }),
    };
  }

  async getProjectAction(user: JwtUser, projectId: string, actionId: string) {
    await this.ensureProjectExists(user.tenantId, projectId);
    return this.ensureProjectActionExists(user, projectId, actionId);
  }

  async createProjectAction(user: JwtUser, projectId: string, dto: CreateProjectActionDto) {
    await this.ensureProjectExists(user.tenantId, projectId);

    const type = await this.prisma.actionType.findFirst({
      where: { id: dto.actionTypeId, tenantId: user.tenantId },
      select: { id: true, isActive: true, target: true },
    });
    if (!type) throw new BadRequestException('Tipo de acao invalido');
    if (!type.isActive) throw new BadRequestException('Tipo de acao inativo');

    const scope = resolveScopeFromTarget({
      target: type.target,
      groupId: dto.projectGroupId ?? null,
      peopleGroupId: dto.peopleGroupId ?? null,
      targetEnrollmentId: dto.targetEnrollmentId ?? null,
    });

    if (type.target === 'PROJECT_GROUP' && !scope.groupId) {
      throw new BadRequestException(
        'Grupo de participantes e obrigatorio para este tipo de acao',
      );
    }
    if (type.target === 'PEOPLE_GROUP' && !scope.peopleGroupId) {
      throw new BadRequestException(
        'Grupo de pessoas e obrigatorio para este tipo de acao',
      );
    }
    if (type.target === 'ENROLLMENT' && !scope.targetEnrollmentId) {
      throw new BadRequestException(
        'Participante e obrigatorio para este tipo de acao',
      );
    }

    if (scope.groupId) {
      await this.ensureProjectGroupBelongsToProject(
        user.tenantId,
        projectId,
        scope.groupId,
      );
    }
    if (scope.peopleGroupId) {
      await this.ensurePeopleGroupBelongsToProject(
        user.tenantId,
        projectId,
        scope.peopleGroupId,
      );
    }
    if (scope.targetEnrollmentId) {
      await this.ensureEnrollmentBelongsToProject(
        user.tenantId,
        projectId,
        scope.targetEnrollmentId,
      );
    }

    const plannedStartAt = parseDateInput(dto.plannedStartAt);
    const plannedEndAt = parseDateInput(dto.plannedEndAt, { endOfDay: true });
    ensureValidPeriod({ startsAt: plannedStartAt ?? null, endsAt: plannedEndAt ?? null });

    const executedStartAt = parseDateInput(dto.executedStartAt);
    const executedEndAt = parseDateInput(dto.executedEndAt, { endOfDay: true });
    ensureValidPeriod({ startsAt: executedStartAt ?? null, endsAt: executedEndAt ?? null });

    const title = (dto.title ?? '').trim();
    if (!title) throw new BadRequestException('Titulo e obrigatorio');

    const created = await this.prisma.projectAction.create({
      data: {
        tenantId: user.tenantId,
        projectId,
        createdByUserId: user.userId,
        groupId: scope.groupId,
        targetEnrollmentId: scope.targetEnrollmentId,
        actionTypeId: dto.actionTypeId,
        title,
        description: dto.description?.trim() ? dto.description.trim() : null,
        tags: normalizeTags(dto.tags),
        internalNotes: dto.internalNotes?.trim() ? dto.internalNotes.trim() : null,
        planHtml: normalizeHtml(dto.planHtml) ?? null,
        executedHtml: normalizeHtml(dto.executedHtml) ?? null,
        conclusionHtml: normalizeHtml(dto.conclusionHtml) ?? null,
        completionPercent: dto.completionPercent ?? null,
        photoPaths: (normalizePhotoPaths(dto.photoPaths) as any) ?? null,
        status: (dto.status as ActionStatus | undefined) ?? 'PLANNED',
        plannedStartAt,
        plannedEndAt,
        executedStartAt,
        executedEndAt,
      },
    });
    await this.syncParticipantPeopleGroupScope({
      tenantId: user.tenantId,
      projectId,
      actionId: created.id,
      peopleGroupId: scope.peopleGroupId,
    });
    return this.getProjectAction(user, projectId, created.id);
  }

  async updateProjectAction(
    user: JwtUser,
    projectId: string,
    actionId: string,
    dto: UpdateProjectActionDto,
  ) {
    await this.ensureProjectExists(user.tenantId, projectId);
    const existing = await this.ensureProjectActionExists(user, projectId, actionId);

    const resolvedActionTypeId = dto.actionTypeId ?? existing.actionTypeId;
    const type = await this.prisma.actionType.findFirst({
      where: { id: resolvedActionTypeId, tenantId: user.tenantId },
      select: { id: true, isActive: true, target: true },
    });
    if (!type) throw new BadRequestException('Tipo de acao invalido');
    if (!type.isActive) throw new BadRequestException('Tipo de acao inativo');

    const groupIdInput =
      dto.projectGroupId === undefined ? (existing.groupId ?? null) : dto.projectGroupId ?? null;
    const peopleGroupIdInput =
      dto.peopleGroupId === undefined ? (existing.peopleGroupId ?? null) : dto.peopleGroupId ?? null;
    const targetEnrollmentIdInput =
      dto.targetEnrollmentId === undefined
        ? ((existing as any).targetEnrollmentId ?? null)
        : dto.targetEnrollmentId ?? null;
    const scope = resolveScopeFromTarget({
      target: type.target,
      groupId: groupIdInput,
      peopleGroupId: peopleGroupIdInput,
      targetEnrollmentId: targetEnrollmentIdInput,
    });

    if (type.target === 'PROJECT_GROUP' && !scope.groupId) {
      throw new BadRequestException(
        'Grupo de participantes e obrigatorio para este tipo de acao',
      );
    }
    if (type.target === 'PEOPLE_GROUP' && !scope.peopleGroupId) {
      throw new BadRequestException(
        'Grupo de pessoas e obrigatorio para este tipo de acao',
      );
    }
    if (type.target === 'ENROLLMENT' && !scope.targetEnrollmentId) {
      throw new BadRequestException(
        'Participante e obrigatorio para este tipo de acao',
      );
    }

    if (scope.groupId) {
      await this.ensureProjectGroupBelongsToProject(
        user.tenantId,
        projectId,
        scope.groupId,
      );
    }
    if (scope.peopleGroupId) {
      await this.ensurePeopleGroupBelongsToProject(
        user.tenantId,
        projectId,
        scope.peopleGroupId,
      );
    }
    if (scope.targetEnrollmentId) {
      await this.ensureEnrollmentBelongsToProject(
        user.tenantId,
        projectId,
        scope.targetEnrollmentId,
      );
    }

    const plannedStartAt =
      dto.plannedStartAt === undefined
        ? existing.plannedStartAt
        : dto.plannedStartAt === null
          ? null
          : (parseDateInput(dto.plannedStartAt) ?? null);
    const plannedEndAt =
      dto.plannedEndAt === undefined
        ? existing.plannedEndAt
        : dto.plannedEndAt === null
          ? null
          : (parseDateInput(dto.plannedEndAt, { endOfDay: true }) ?? null);
    ensureValidPeriod({ startsAt: plannedStartAt ?? null, endsAt: plannedEndAt ?? null });

    const executedStartAt =
      dto.executedStartAt === undefined
        ? existing.executedStartAt
        : dto.executedStartAt === null
          ? null
          : (parseDateInput(dto.executedStartAt) ?? null);
    const executedEndAt =
      dto.executedEndAt === undefined
        ? existing.executedEndAt
        : dto.executedEndAt === null
          ? null
          : (parseDateInput(dto.executedEndAt, { endOfDay: true }) ?? null);
    ensureValidPeriod({ startsAt: executedStartAt ?? null, endsAt: executedEndAt ?? null });

    const title = dto.title !== undefined ? (dto.title ?? '').trim() : undefined;
    if (title !== undefined && !title) throw new BadRequestException('Titulo e obrigatorio');

    const planHtml = normalizeHtml(dto.planHtml);
    const executedHtml = normalizeHtml(dto.executedHtml);
    const conclusionHtml = normalizeHtml(dto.conclusionHtml);
    const photoPaths = normalizePhotoPaths(dto.photoPaths);
    const normalizedTags = dto.tags !== undefined ? normalizeTags(dto.tags) : undefined;

    await this.prisma.projectAction.update({
      where: { id: existing.id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() ? dto.description.trim() : null }
          : {}),
        ...(dto.tags !== undefined ? { tags: normalizedTags } : {}),
        ...(dto.internalNotes !== undefined
          ? { internalNotes: dto.internalNotes?.trim() ? dto.internalNotes.trim() : null }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status as ActionStatus } : {}),
        ...(dto.actionTypeId !== undefined ? { actionTypeId: resolvedActionTypeId } : {}),
        ...(dto.actionTypeId !== undefined ||
        dto.projectGroupId !== undefined ||
        dto.peopleGroupId !== undefined ||
        dto.targetEnrollmentId !== undefined
          ? {
              groupId: scope.groupId,
              targetEnrollmentId: scope.targetEnrollmentId,
            }
          : {}),
        ...(planHtml !== undefined ? { planHtml } : {}),
        ...(executedHtml !== undefined ? { executedHtml } : {}),
        ...(conclusionHtml !== undefined ? { conclusionHtml } : {}),
        ...(dto.completionPercent !== undefined
          ? { completionPercent: dto.completionPercent ?? null }
          : {}),
        ...(photoPaths !== undefined ? { photoPaths: (photoPaths as any) ?? null } : {}),
        ...(dto.plannedStartAt !== undefined ? { plannedStartAt } : {}),
        ...(dto.plannedEndAt !== undefined ? { plannedEndAt } : {}),
        ...(dto.executedStartAt !== undefined ? { executedStartAt } : {}),
        ...(dto.executedEndAt !== undefined ? { executedEndAt } : {}),
      },
    });
    if (
      dto.actionTypeId !== undefined ||
      dto.projectGroupId !== undefined ||
      dto.peopleGroupId !== undefined ||
      dto.targetEnrollmentId !== undefined
    ) {
      await this.syncParticipantPeopleGroupScope({
        tenantId: user.tenantId,
        projectId,
        actionId: existing.id,
        peopleGroupId: scope.peopleGroupId,
      });
    }
    return this.getProjectAction(user, projectId, existing.id);
  }

  async deleteProjectAction(user: JwtUser, projectId: string, actionId: string) {
    await this.ensureProjectExists(user.tenantId, projectId);
    const existing = await this.ensureProjectActionExists(user, projectId, actionId);

    await this.prisma.projectActionAttendance.deleteMany({
      where: { tenantId: user.tenantId, actionId: existing.id },
    });
    await this.prisma.projectActionPeopleParticipation.deleteMany({
      where: { tenantId: user.tenantId, actionId: existing.id },
    });
    await this.prisma.projectActionComment.deleteMany({
      where: { tenantId: user.tenantId, actionId: existing.id },
    });
    await this.prisma.projectActionAttachment.deleteMany({
      where: { tenantId: user.tenantId, actionId: existing.id },
    });

    await this.prisma.projectAction.delete({ where: { id: existing.id } });
    return { ok: true as const };
  }

  async addProjectActionComment(
    user: JwtUser,
    projectId: string,
    actionId: string,
    dto: { body: string; mentionUserIds?: string[] | null },
  ) {
    const action = await this.ensureProjectActionExists(user, projectId, actionId);
    const body = dto.body.trim();
    if (!body) {
      throw new BadRequestException('Informe um comentario.');
    }

    const mentionUserIds = await this.resolveMentionUserIds(user.tenantId, dto.mentionUserIds);

    await this.prisma.projectActionComment.create({
      data: {
        tenantId: user.tenantId,
        actionId: action.id,
        authorUserId: user.userId,
        body,
        mentionUserIds,
      },
    });

    return this.getProjectAction(user, projectId, action.id);
  }

  async deleteProjectActionComment(
    user: JwtUser,
    projectId: string,
    actionId: string,
    commentId: string,
  ) {
    const action = await this.ensureProjectActionExists(user, projectId, actionId);
    const comment = await this.prisma.projectActionComment.findFirst({
      where: { id: commentId, tenantId: user.tenantId, actionId: action.id },
      select: { id: true },
    });
    if (!comment) {
      throw new NotFoundException('Comentario nao encontrado');
    }

    await this.prisma.projectActionComment.delete({ where: { id: comment.id } });
    return this.getProjectAction(user, projectId, action.id);
  }

  async addProjectActionAttachment(
    user: JwtUser,
    projectId: string,
    actionId: string,
    dto: { label: string; filePath: string; mimeType?: string | null; fileSizeBytes?: number | null },
  ) {
    const action = await this.ensureProjectActionExists(user, projectId, actionId);
    const label = dto.label.trim();
    const filePath = dto.filePath.trim();

    if (!label) {
      throw new BadRequestException('Informe um nome para o anexo.');
    }

    if (!filePath.startsWith('/uploads/action-attachments/')) {
      throw new BadRequestException('Caminho de anexo invalido.');
    }

    await this.prisma.projectActionAttachment.create({
      data: {
        tenantId: user.tenantId,
        actionId: action.id,
        uploadedByUserId: user.userId,
        label,
        filePath,
        mimeType: normalizeString(dto.mimeType),
        fileSizeBytes: dto.fileSizeBytes ?? null,
      },
    });

    return this.getProjectAction(user, projectId, action.id);
  }

  async deleteProjectActionAttachment(
    user: JwtUser,
    projectId: string,
    actionId: string,
    attachmentId: string,
  ) {
    const action = await this.ensureProjectActionExists(user, projectId, actionId);
    const attachment = await this.prisma.projectActionAttachment.findFirst({
      where: { id: attachmentId, tenantId: user.tenantId, actionId: action.id },
      select: { id: true },
    });
    if (!attachment) {
      throw new NotFoundException('Anexo nao encontrado');
    }

    await this.prisma.projectActionAttachment.delete({ where: { id: attachment.id } });
    return this.getProjectAction(user, projectId, action.id);
  }

  async listActionPeopleGroups(
    user: JwtUser,
    projectId: string,
    actionId: string,
    query: ListActionPeopleGroupsQueryDto,
  ) {
    await this.ensureProjectExists(user.tenantId, projectId);
    await this.ensureProjectActionExists(user, projectId, actionId);

    return this.prisma.actionPeopleGroup.findMany({
      where: {
        tenantId: user.tenantId,
        actionId,
        ...(query.participationKind ? { participationKind: query.participationKind } : {}),
      },
      include: {
        peopleGroup: true,
      },
      orderBy: [{ participationKind: 'asc' }, { peopleGroup: { name: 'asc' } }],
    });
  }

  async createActionPeopleGroup(
    user: JwtUser,
    projectId: string,
    actionId: string,
    dto: CreateActionPeopleGroupDto,
  ) {
    await this.ensureProjectExists(user.tenantId, projectId);
    await this.ensureProjectActionExists(user, projectId, actionId);

    await this.ensurePeopleGroupBelongsToProject(
      user.tenantId,
      projectId,
      dto.peopleGroupId,
      dto.participationKind,
    );

    return this.prisma.actionPeopleGroup.create({
      data: {
        tenantId: user.tenantId,
        actionId,
        peopleGroupId: dto.peopleGroupId,
        participationKind: dto.participationKind,
      },
      include: { peopleGroup: true },
    });
  }

  async deleteActionPeopleGroup(
    user: JwtUser,
    projectId: string,
    actionId: string,
    actionPeopleGroupId: string,
  ) {
    await this.ensureProjectExists(user.tenantId, projectId);
    await this.ensureProjectActionExists(user, projectId, actionId);

    const existing = await this.prisma.actionPeopleGroup.findFirst({
      where: {
        id: actionPeopleGroupId,
        tenantId: user.tenantId,
        actionId,
      },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Vinculo do grupo de pessoas nao encontrado');

    await this.prisma.actionPeopleGroup.delete({ where: { id: existing.id } });
    return { ok: true as const };
  }

  async listProjectActionPeopleParticipations(
    user: JwtUser,
    projectId: string,
    actionId: string,
    query: ListProjectActionPeopleParticipationsQueryDto,
  ) {
    await this.ensureProjectExists(user.tenantId, projectId);
    await this.ensureProjectActionExists(user, projectId, actionId);

    const { page, limit, skip, take } = resolvePagination({
      page: query.page,
      limit: query.limit,
      all: false,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    });

    const q = normalizeString(query.q);
    const where: Prisma.ProjectActionPeopleParticipationWhereInput = {
      tenantId: user.tenantId,
      actionId,
      isActive: true,
      deletedAt: null,
      ...(query.role ? { role: query.role as ActionPeopleParticipationRole } : {}),
      ...(q
        ? {
            OR: [
              { person: { fullName: { contains: q } } },
              { person: { socialName: { contains: q } } },
              { enrollment: { person: { status: { contains: q } } } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.projectActionPeopleParticipation.findMany({
        where,
        include: {
          person: {
            select: {
              id: true,
              fullName: true,
              socialName: true,
              birthDate: true,
              status: true,
              avatarUrl: true,
              sex: true,
              gender: true,
              raceColor: true,
              peopleGroupParticipations: {
                where: { isActive: true, deletedAt: null },
                select: {
                  peopleGroup: {
                    select: {
                      id: true,
                      name: true,
                      category: true,
                    },
                  },
                },
              },
              _count: { select: { healthConditions: true, medications: true } },
            },
          },
          enrollment: {
            include: {
              person: {
                select: {
                  id: true,
                  fullName: true,
                  avatarUrl: true,
                  birthDate: true,
                  status: true,
                  sex: true,
                  gender: true,
                  raceColor: true,
                  peopleGroupParticipations: {
                    where: { isActive: true, deletedAt: null },
                    select: {
                      peopleGroup: {
                        select: {
                          id: true,
                          name: true,
                          category: true,
                        },
                      },
                    },
                  },
                  _count: { select: { healthConditions: true, medications: true } },
                },
              },
              groupMemberships: {
                where: { isActive: true, deletedAt: null },
                include: { group: { select: { id: true, name: true } } },
              },
            },
          },
        },
        orderBy: [{ role: 'asc' }, { person: { fullName: 'asc' } }],
        skip,
        take,
      }),
      this.prisma.projectActionPeopleParticipation.count({ where }),
    ]);

    return {
      data: data.map((row) => ({
        ...row,
        person: {
          ...row.person,
          hasHealthCondition: (row.person._count.healthConditions ?? 0) > 0,
          hasMedication: (row.person._count.medications ?? 0) > 0,
          _count: undefined,
        },
        enrollment: row.enrollment ? this.serializeEnrollment(row.enrollment as any) : null,
      })),
      pagination: buildPaginationMeta({ page, limit, total, isAll: false }),
    };
  }

  async listEligibleProjectActionPeople(
    user: JwtUser,
    projectId: string,
    actionId: string,
    query: ListEligibleProjectActionPeopleQueryDto,
  ) {
    await this.ensureProjectExists(user.tenantId, projectId);
    await this.ensureProjectActionExists(user, projectId, actionId);

    const { page, limit, skip, take } = resolvePagination({
      page: query.page,
      limit: query.limit,
      all: false,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    });

    const q = normalizeString(query.q);
    const filters = parseAdvancedFilters(query.filters);
    const participationKind: ParticipationKind = query.participationKind ?? 'TEAM';
    const actionPeopleGroups = await this.prisma.actionPeopleGroup.findMany({
      where: {
        tenantId: user.tenantId,
        actionId,
        participationKind,
      },
      select: { peopleGroupId: true },
      distinct: ['peopleGroupId'],
    });
    let scopedPeopleGroupIds = actionPeopleGroups.map((row) => row.peopleGroupId);
    if (!scopedPeopleGroupIds.length) {
      const projectPeopleGroups = await this.prisma.projectPeopleGroup.findMany({
        where: {
          tenantId: user.tenantId,
          projectId,
          participationKind,
        },
        select: { peopleGroupId: true },
        distinct: ['peopleGroupId'],
      });
      scopedPeopleGroupIds = projectPeopleGroups.map((row) => row.peopleGroupId);
    }
    const personBaseWhere = buildPeopleWhere({
      tenantId: user.tenantId,
      query: q ?? undefined,
      filters,
    });
    const peopleGroupScope: Prisma.PersonWhereInput | null = scopedPeopleGroupIds.length
      ? {
          peopleGroupParticipations: {
            some: {
              tenantId: user.tenantId,
              peopleGroupId: { in: scopedPeopleGroupIds },
              isActive: true,
              deletedAt: null,
            },
          },
        }
      : null;
    const where: Prisma.ProjectEnrollmentWhereInput = {
      tenantId: user.tenantId,
      projectId,
      participationKind,
      status: 'ACTIVE',
      deletedAt: null,
      actionPeopleParticipations: {
        none: {
          tenantId: user.tenantId,
          actionId,
          isActive: true,
          deletedAt: null,
        },
      },
      person:
        peopleGroupScope !== null
          ? { AND: [personBaseWhere, peopleGroupScope] }
          : personBaseWhere,
    };

    const [data, total] = await Promise.all([
      this.prisma.projectEnrollment.findMany({
        where,
        include: {
          person: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              birthDate: true,
              status: true,
              sex: true,
              gender: true,
              raceColor: true,
              peopleGroupParticipations: {
                where: { isActive: true, deletedAt: null },
                select: {
                  peopleGroup: {
                    select: {
                      id: true,
                      name: true,
                      category: true,
                    },
                  },
                },
              },
              _count: { select: { healthConditions: true, medications: true } },
            },
          },
          groupMemberships: {
            where: { isActive: true, deletedAt: null },
            include: { group: { select: { id: true, name: true } } },
          },
        },
        orderBy: [{ person: { fullName: 'asc' } }],
        skip,
        take,
      }),
      this.prisma.projectEnrollment.count({ where }),
    ]);

    return {
      data: data.map((enrollment) => this.serializeEnrollment(enrollment as any)),
      pagination: buildPaginationMeta({ page, limit, total, isAll: false }),
    };
  }

  async createProjectActionPeopleParticipation(
    user: JwtUser,
    projectId: string,
    actionId: string,
    dto: CreateProjectActionPeopleParticipationDto,
  ) {
    await this.ensureProjectExists(user.tenantId, projectId);
    await this.ensureProjectActionExists(user, projectId, actionId);

    const person = await this.prisma.person.findFirst({
      where: { id: dto.personId, tenantId: user.tenantId },
      select: { id: true },
    });
    if (!person) throw new BadRequestException('Pessoa invalida');

    let enrollmentId: string | null = null;
    if (dto.enrollmentId) {
      const enrollment = await this.prisma.projectEnrollment.findFirst({
        where: {
          id: dto.enrollmentId,
          tenantId: user.tenantId,
          projectId,
          personId: dto.personId,
          participationKind: dto.participationKind ?? 'TEAM',
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!enrollment) {
        throw new BadRequestException('Participacao no projeto invalida');
      }
      enrollmentId = enrollment.id;
    } else {
      const activeEnrollment = await this.prisma.projectEnrollment.findFirst({
        where: {
          tenantId: user.tenantId,
          projectId,
          personId: dto.personId,
          participationKind: dto.participationKind ?? 'TEAM',
          status: 'ACTIVE',
          deletedAt: null,
        },
        select: { id: true },
      });
      enrollmentId = activeEnrollment?.id ?? null;
    }

    const role: ActionPeopleParticipationRole = dto.role ?? 'PARTICIPANTE';
    const activeKey = `${actionId}:${dto.personId}:${role}`;
    const startsAt = parseDateInput(dto.startsAt) ?? new Date();

    const existing = await this.prisma.projectActionPeopleParticipation.findFirst({
      where: {
        tenantId: user.tenantId,
        actionId,
        personId: dto.personId,
        role,
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('Pessoa ja esta vinculada a esta acao com esse papel.');
    }

    return this.prisma.projectActionPeopleParticipation.create({
      data: {
        tenantId: user.tenantId,
        actionId,
        personId: dto.personId,
        enrollmentId,
        participationKind: dto.participationKind ?? 'TEAM',
        role,
        activeKey,
        isActive: true,
        startsAt,
        internalNotes: dto.internalNotes?.trim() ? dto.internalNotes.trim() : null,
      },
      include: {
        person: {
          select: {
            id: true,
            fullName: true,
            socialName: true,
            birthDate: true,
            status: true,
            avatarUrl: true,
            sex: true,
            gender: true,
            raceColor: true,
            peopleGroupParticipations: {
              where: { isActive: true, deletedAt: null },
              select: {
                peopleGroup: {
                  select: {
                    id: true,
                    name: true,
                    category: true,
                  },
                },
              },
            },
            _count: { select: { healthConditions: true, medications: true } },
          },
        },
        enrollment: {
          include: {
            person: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
                birthDate: true,
                status: true,
                sex: true,
                gender: true,
                raceColor: true,
                peopleGroupParticipations: {
                  where: { isActive: true, deletedAt: null },
                  select: {
                    peopleGroup: {
                      select: {
                        id: true,
                        name: true,
                        category: true,
                      },
                    },
                  },
                },
                _count: { select: { healthConditions: true, medications: true } },
              },
            },
            groupMemberships: {
              where: { isActive: true, deletedAt: null },
              include: { group: { select: { id: true, name: true } } },
            },
          },
        },
      },
    }).then((row) => ({
      ...row,
      person: {
        ...row.person,
        hasHealthCondition: (row.person._count.healthConditions ?? 0) > 0,
        hasMedication: (row.person._count.medications ?? 0) > 0,
        _count: undefined,
      },
      enrollment: row.enrollment ? this.serializeEnrollment(row.enrollment as any) : null,
    }));
  }

  async endProjectActionPeopleParticipation(
    user: JwtUser,
    projectId: string,
    actionId: string,
    participationId: string,
    dto: EndProjectActionPeopleParticipationDto,
  ) {
    await this.ensureProjectExists(user.tenantId, projectId);
    await this.ensureProjectActionExists(user, projectId, actionId);

    const existing = await this.prisma.projectActionPeopleParticipation.findFirst({
      where: { id: participationId, tenantId: user.tenantId, actionId },
      select: { id: true, internalNotes: true, deletedAt: true },
    });
    if (!existing) throw new NotFoundException('Participacao da acao nao encontrada');
    if (existing.deletedAt) return { ok: true as const };

    const endsAt = parseDateInput(dto.endsAt, { endOfDay: true }) ?? new Date();
    const noteSuffix = dto.internalNotes?.trim() ? dto.internalNotes.trim() : null;

    await this.prisma.projectActionPeopleParticipation.update({
      where: { id: existing.id },
      data: {
        activeKey: null,
        isActive: false,
        endsAt,
        deletedAt: new Date(),
        internalNotes: noteSuffix
          ? [existing.internalNotes?.trim(), noteSuffix].filter(Boolean).join('\n\n')
          : existing.internalNotes,
      },
    });

    return { ok: true as const };
  }

  async listProjectActionAttendances(
    user: JwtUser,
    projectId: string,
    actionId: string,
    query: ListProjectActionAttendancesQueryDto,
  ) {
    await this.ensureProjectExists(user.tenantId, projectId);
    const action = await this.ensureProjectActionExists(user, projectId, actionId);

    const { page, limit, skip, take } = resolvePagination({
      page: query.page,
      limit: query.limit,
      all: false,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    });

    const q = normalizeString(query.q);
    const scopedGroupId = action.groupId ?? query.groupId ?? null;
    const scopedPeopleGroupId = (action as any).peopleGroupId ?? null;

    const where: Prisma.ProjectEnrollmentWhereInput = {
      tenantId: user.tenantId,
      projectId,
      status: 'ACTIVE',
      ...(action.targetEnrollmentId ? { id: action.targetEnrollmentId } : {}),
      ...(scopedGroupId
        ? { groupMemberships: { some: { isActive: true, groupId: scopedGroupId } } }
        : {}),
      ...(q
        ? {
            OR: [
              { person: { fullName: { contains: q } } },
              {
                groupMemberships: {
                  some: { isActive: true, group: { name: { contains: q } } },
                },
              },
              {
                person: {
                  peopleGroupParticipations: {
                    some: {
                      tenantId: user.tenantId,
                      isActive: true,
                      deletedAt: null,
                      peopleGroup: { name: { contains: q } },
                    },
                  },
                },
              },
            ],
          }
        : {}),
      ...(scopedPeopleGroupId
        ? {
            person: {
              peopleGroupParticipations: {
                some: {
                  tenantId: user.tenantId,
                  peopleGroupId: scopedPeopleGroupId,
                  isActive: true,
                  deletedAt: null,
                },
              },
            },
          }
        : {}),
    };

    const [enrollments, total] = await Promise.all([
      this.prisma.projectEnrollment.findMany({
        where,
        include: {
          person: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              birthDate: true,
              status: true,
              sex: true,
              gender: true,
              raceColor: true,
              peopleGroupParticipations: {
                where: { isActive: true, deletedAt: null },
                select: {
                  peopleGroup: {
                    select: {
                      id: true,
                      name: true,
                      category: true,
                    },
                  },
                },
              },
              _count: { select: { healthConditions: true, medications: true } },
            },
          },
          groupMemberships: {
            where: { isActive: true },
            include: { group: { select: { id: true, name: true } } },
          },
        },
        orderBy: [{ person: { fullName: 'asc' } }],
        skip,
        take,
      }),
      this.prisma.projectEnrollment.count({ where }),
    ]);

    const attendanceRows = await this.prisma.projectActionAttendance.findMany({
      where: {
        tenantId: user.tenantId,
        actionId,
        enrollmentId: { in: enrollments.map((row) => row.id) },
        ...(query.status ? { status: query.status as AttendanceStatus } : {}),
      },
      select: {
        id: true,
        enrollmentId: true,
        status: true,
        notes: true,
        qualityScore: true,
        qualityNotes: true,
        isHighlight: true,
        updatedAt: true,
      },
    });

    const attendanceByEnrollment = new Map(attendanceRows.map((row) => [row.enrollmentId, row]));

    const data = enrollments
      .map((enrollment) => {
        const serialized = this.serializeEnrollment(enrollment as any);
        const attendance = attendanceByEnrollment.get(enrollment.id) ?? null;
        return { enrollment: serialized, attendance };
      })
      .filter((row) => (query.status ? row.attendance !== null : true));

    return {
      action: {
        id: action.id,
        title: action.title,
        projectGroupId: action.groupId,
        peopleGroupId: (action as any).peopleGroupId ?? null,
        targetEnrollmentId: (action as any).targetEnrollmentId ?? null,
      },
      data,
      pagination: buildPaginationMeta({ page, limit, total, isAll: false }),
    };
  }

  async upsertProjectActionAttendances(
    user: JwtUser,
    projectId: string,
    actionId: string,
    dto: UpsertProjectActionAttendancesDto,
  ) {
    await this.ensureProjectExists(user.tenantId, projectId);
    const action = await this.ensureProjectActionExists(user, projectId, actionId);

    const items = dto.items ?? [];
    if (items.length === 0) return { ok: true as const, created: 0, updated: 0 };

    const enrollmentIds = Array.from(new Set(items.map((item) => item.enrollmentId)));
    const enrollments = await this.prisma.projectEnrollment.findMany({
      where: { tenantId: user.tenantId, projectId, id: { in: enrollmentIds } },
      select: { id: true },
    });
    if (enrollments.length !== enrollmentIds.length) {
      throw new BadRequestException('Matricula invalida');
    }

    const existing = await this.prisma.projectActionAttendance.findMany({
      where: { tenantId: user.tenantId, actionId, enrollmentId: { in: enrollmentIds } },
      select: { id: true, enrollmentId: true },
    });
    const existingByEnrollment = new Map(existing.map((row) => [row.enrollmentId, row.id]));

    let created = 0;
    let updated = 0;

    const batchSize = 25;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (item) => {
          const notes =
            item.notes === undefined
              ? undefined
              : item.notes === null
                ? null
                : item.notes.trim()
                  ? item.notes.trim()
                  : null;
          const qualityNotes =
            item.qualityNotes === undefined
              ? undefined
              : item.qualityNotes === null
                ? null
                : item.qualityNotes.trim()
                  ? item.qualityNotes.trim()
                  : null;

          const existingId = existingByEnrollment.get(item.enrollmentId) ?? null;

          if (existingId) {
            await this.prisma.projectActionAttendance.update({
              where: { id: existingId },
              data: {
                status: item.status,
                ...(notes !== undefined ? { notes } : {}),
                ...(item.qualityScore !== undefined ? { qualityScore: item.qualityScore ?? null } : {}),
                ...(qualityNotes !== undefined ? { qualityNotes } : {}),
                ...(item.isHighlight !== undefined ? { isHighlight: item.isHighlight } : {}),
              },
            });
            updated += 1;
            return;
          }

          await this.prisma.projectActionAttendance.create({
            data: {
              tenantId: user.tenantId,
              actionId,
              enrollmentId: item.enrollmentId,
              status: item.status,
              notes: notes === undefined ? null : notes,
              qualityScore: item.qualityScore ?? null,
              qualityNotes: qualityNotes === undefined ? null : qualityNotes,
              isHighlight: item.isHighlight ?? false,
            },
          });
          created += 1;
        }),
      );

      const failed = results.find((result) => result.status === 'rejected');
      if (failed && failed.status === 'rejected') {
        throw failed.reason;
      }
    }

    return { ok: true as const, created, updated };
  }

  private async resolveMentionUserIds(tenantId: string, mentionUserIds?: string[] | null) {
    const normalized = Array.from(
      new Set((mentionUserIds ?? []).map((entry) => entry.trim()).filter(Boolean)),
    );

    if (!normalized.length) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        id: { in: normalized },
      },
      select: { id: true },
    });

    return users.map((user) => user.id);
  }
}
