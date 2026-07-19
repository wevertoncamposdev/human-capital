import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  EnrollmentStatus,
  ParticipationKind,
  Prisma,
  ProjectParticipationRole,
} from '../../generated/prisma';
import { PrismaService } from '../../core/prisma/prisma.service';
import { parseDateInput } from '../../core/utils/dates';
import { buildPaginationMeta, resolvePagination } from '../../core/utils/pagination';
import { normalizeString } from '../../core/utils/strings';
import { buildPeopleWhere, parseAdvancedFilters } from '../people/people.filters';
import { CreateProjectEnrollmentDto } from './dto/create-project-enrollment.dto';
import { CreateProjectGroupDto } from './dto/create-project-group.dto';
import { CreateProjectPeopleGroupDto } from './dto/create-project-people-group.dto';
import { ListEligibleProjectPeopleQueryDto } from './dto/list-eligible-project-people-query.dto';
import { ListProjectEnrollmentsQueryDto } from './dto/list-project-enrollments-query.dto';
import { ListProjectPeopleGroupsQueryDto } from './dto/list-project-people-groups-query.dto';
import { UpdateProjectEnrollmentDto } from './dto/update-project-enrollment.dto';
import { UpdateProjectGroupDto } from './dto/update-project-group.dto';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;

function ensureValidPeriod(params: { startsAt?: Date | null; endsAt?: Date | null }) {
  const startsAt = params.startsAt ?? null;
  const endsAt = params.endsAt ?? null;
  if (startsAt && endsAt && startsAt > endsAt) {
    throw new BadRequestException('PerÃ­odo invÃ¡lido: inÃ­cio maior que tÃ©rmino');
  }
}

@Injectable()
export class ProjectStructureService {
  constructor(private readonly prisma: PrismaService) {}

  private serializeEnrollment<T extends { groupMemberships?: any[] }>(
    enrollment: T,
  ) {
    const groups = (enrollment.groupMemberships ?? []).map((m) => m.group);
    const groupMembershipHistory = (enrollment.groupMemberships ?? []).map((membership) => ({
      id: membership.id,
      isActive: membership.isActive,
      startsAt: membership.startsAt,
      endsAt: membership.endsAt,
      deletedAt: membership.deletedAt,
      group: membership.group,
    }));
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
      groupMembershipHistory,
      cycle: null,
      peopleGroups,
      groupMemberships: undefined,
    };
  }

  private async getPeopleGroup(tenantId: string, peopleGroupId: string) {
    const peopleGroup = await this.prisma.peopleGroup.findFirst({
      where: { id: peopleGroupId, tenantId },
      select: {
        id: true,
        name: true,
        groupType: true,
        category: true,
        ageMin: true,
        ageMax: true,
        isActive: true,
      },
    });
    if (!peopleGroup) throw new BadRequestException('Grupo de pessoas invalido');
    return peopleGroup;
  }

  private async ensureProjectExists(tenantId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Projeto nÃ£o encontrado');
  }

  async listGroups(tenantId: string, projectId: string) {
    await this.ensureProjectExists(tenantId, projectId);
    return this.prisma.projectGroup.findMany({
      where: { tenantId, projectId },
      orderBy: { name: 'asc' },
    });
  }

  async listPeopleGroups(
    tenantId: string,
    projectId: string,
    query: ListProjectPeopleGroupsQueryDto,
  ) {
    await this.ensureProjectExists(tenantId, projectId);
    return this.prisma.projectPeopleGroup.findMany({
      where: {
        tenantId,
        projectId,
        ...(query.participationKind ? { participationKind: query.participationKind } : {}),
      },
      include: {
        peopleGroup: true,
      },
      orderBy: [{ participationKind: 'asc' }, { peopleGroup: { name: 'asc' } }],
    });
  }

  async createPeopleGroup(
    tenantId: string,
    projectId: string,
    dto: CreateProjectPeopleGroupDto,
  ) {
    await this.ensureProjectExists(tenantId, projectId);
    await this.getPeopleGroup(tenantId, dto.peopleGroupId);

    return this.prisma.projectPeopleGroup.create({
      data: {
        tenantId,
        projectId,
        peopleGroupId: dto.peopleGroupId,
        participationKind: dto.participationKind,
      },
      include: { peopleGroup: true },
    });
  }

  async deletePeopleGroup(tenantId: string, projectId: string, projectPeopleGroupId: string) {
    const existing = await this.prisma.projectPeopleGroup.findFirst({
      where: { id: projectPeopleGroupId, tenantId, projectId },
      select: { id: true, peopleGroupId: true, participationKind: true },
    });
    if (!existing) throw new NotFoundException('Vinculo do grupo de pessoas nao encontrado');

    const actionsCount = await this.prisma.actionPeopleGroup.count({
      where: {
        tenantId,
        peopleGroupId: existing.peopleGroupId,
        participationKind: existing.participationKind,
        action: { projectId },
      },
    });
    if (actionsCount > 0) {
      throw new BadRequestException(
        'Nao e possivel remover o grupo de pessoas: existem acoes vinculadas',
      );
    }

    await this.prisma.projectPeopleGroup.delete({ where: { id: existing.id } });
    return { ok: true as const };
  }

  async listAllGroups(
    tenantId: string,
    params: { q?: string; page?: number; limit?: number; all?: boolean },
  ) {
    const { page, limit, skip, take, isAll } = resolvePagination({
      page: params.page,
      limit: params.limit,
      all: params.all,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    });
    const q = normalizeString(params.q);
    const where: Prisma.ProjectGroupWhereInput = {
      tenantId,
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { description: { contains: q } },
              { internalNotes: { contains: q } },
              { project: { name: { contains: q } } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.projectGroup.findMany({
        where,
        include: {
          project: {
            select: { id: true, name: true, programId: true },
          },
          _count: { select: { memberships: true, actions: true } },
        },
        orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }],
        ...(isAll ? {} : { skip, take }),
      }),
      this.prisma.projectGroup.count({ where }),
    ]);

    return {
      data,
      pagination: buildPaginationMeta({ page, limit, total, isAll }),
    };
  }

  async createGroup(tenantId: string, projectId: string, dto: CreateProjectGroupDto) {
    await this.ensureProjectExists(tenantId, projectId);
    const name = (dto.name ?? '').trim();
    if (!name) throw new BadRequestException('Nome Ã© obrigatÃ³rio');
    return this.prisma.projectGroup.create({
      data: {
        tenantId,
        projectId,
        name,
        description: dto.description?.trim() ? dto.description.trim() : null,
        internalNotes: dto.internalNotes?.trim() ? dto.internalNotes.trim() : null,
      },
    });
  }

  async updateGroup(
    tenantId: string,
    projectId: string,
    groupId: string,
    dto: UpdateProjectGroupDto,
  ) {
    const existing = await this.prisma.projectGroup.findFirst({
      where: { id: groupId, tenantId, projectId },
    });
    if (!existing) throw new NotFoundException('Grupo nÃ£o encontrado');

    const name = dto.name !== undefined ? (dto.name ?? '').trim() : undefined;
    if (name !== undefined && !name) {
      throw new BadRequestException('Nome Ã© obrigatÃ³rio');
    }

    return this.prisma.projectGroup.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() ? dto.description.trim() : null }
          : {}),
        ...(dto.internalNotes !== undefined
          ? { internalNotes: dto.internalNotes?.trim() ? dto.internalNotes.trim() : null }
          : {}),
      },
    });
  }

  async deleteGroup(tenantId: string, projectId: string, groupId: string) {
    const existing = await this.prisma.projectGroup.findFirst({
      where: { id: groupId, tenantId, projectId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Grupo nÃ£o encontrado');

    const membershipsCount = await this.prisma.projectEnrollmentGroupMembership.count({
      where: { tenantId, groupId: existing.id },
    });
    const actionsCount = await this.prisma.projectAction.count({
      where: { tenantId, projectId, groupId: existing.id },
    });
    if (membershipsCount > 0) {
      throw new BadRequestException(
        'NÃ£o Ã© possÃ­vel excluir o grupo: existem participantes vinculados',
      );
    }

    if (actionsCount > 0) {
      throw new BadRequestException(
        'Nao e possivel excluir o grupo: existem acoes vinculadas',
      );
    }

    await this.prisma.projectGroup.delete({ where: { id: existing.id } });
    return { ok: true as const };
  }

  async listEnrollments(
    tenantId: string,
    projectId: string,
    query: ListProjectEnrollmentsQueryDto,
  ) {
    await this.ensureProjectExists(tenantId, projectId);
    const { page, limit, skip, take, isAll } = resolvePagination({
      page: query.page,
      limit: query.limit,
      all: false,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    });

    const q = normalizeString(query.q);
    const filters = parseAdvancedFilters(query.filters);
    const personWhere = buildPeopleWhere({ tenantId, query: undefined, filters });
    const scopedPeopleGroupId = query.peopleGroupId ?? null;
    const excludedPeopleGroupId = query.excludePeopleGroupId ?? null;
    const and: Prisma.ProjectEnrollmentWhereInput[] = [];
    if (query.excludeGroupId) {
      and.push({
        NOT: {
          groupMemberships: {
            some: { isActive: true, deletedAt: null, groupId: query.excludeGroupId },
          },
        },
      });
    }
    if (excludedPeopleGroupId) {
      and.push({
        NOT: {
          person: {
            peopleGroupParticipations: {
              some: {
                tenantId,
                peopleGroupId: excludedPeopleGroupId,
                isActive: true,
                deletedAt: null,
              },
            },
          },
        },
      });
    }

    const where: Prisma.ProjectEnrollmentWhereInput = {
      tenantId,
      projectId,
      deletedAt: null,
      ...(query.status ? { status: query.status as EnrollmentStatus } : {}),
      ...(query.groupHistoryId
        ? {
            groupMemberships: {
              some: { groupId: query.groupHistoryId },
            },
          }
        : query.groupId
        ? {
            groupMemberships: {
              some: { isActive: true, deletedAt: null, groupId: query.groupId },
            },
          }
        : {}),
      ...(scopedPeopleGroupId
        ? {
            person: {
              AND: [
                personWhere,
                {
                  peopleGroupParticipations: {
                    some: {
                      tenantId,
                      peopleGroupId: scopedPeopleGroupId,
                      isActive: true,
                      deletedAt: null,
                    },
                  },
                },
              ],
            },
          }
        : { person: personWhere }),
      ...(and.length ? { AND: and } : {}),
      ...(q
        ? {
          OR: [
            { person: { fullName: { contains: q } } },
              { person: { socialName: { contains: q } } },
              { person: { personType: { contains: q } } },
              { person: { status: { contains: q } } },
              {
                groupMemberships: {
                  some: { isActive: true, deletedAt: null, group: { name: { contains: q } } },
                },
              },
              {
                person: {
                  peopleGroupParticipations: {
                    some: {
                      tenantId,
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
            where: query.groupHistoryId
              ? { groupId: query.groupHistoryId }
              : { isActive: true, deletedAt: null },
            include: { group: { select: { id: true, name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        ...(isAll ? {} : { skip, take }),
      }),
      this.prisma.projectEnrollment.count({ where }),
    ]);

    return {
      data: data.map((enrollment) => this.serializeEnrollment(enrollment)),
      pagination: buildPaginationMeta({ page, limit, total, isAll }),
    };
  }

  async listEligiblePeople(
    tenantId: string,
    projectId: string,
    query: ListEligibleProjectPeopleQueryDto,
  ) {
    await this.ensureProjectExists(tenantId, projectId);

    const { page, limit, skip, take } = resolvePagination({
      page: query.page,
      limit: query.limit,
      all: false,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    });

    const filters = parseAdvancedFilters(query.filters);
    const projectPeopleGroups = await this.prisma.projectPeopleGroup.findMany({
      where: {
        tenantId,
        projectId,
        participationKind: 'PARTICIPANT',
      },
      select: { peopleGroupId: true },
      distinct: ['peopleGroupId'],
    });

    const projectPeopleGroupIds = projectPeopleGroups.map((row) => row.peopleGroupId);
    if (projectPeopleGroupIds.length === 0) {
      return {
        data: [],
        pagination: buildPaginationMeta({ page, limit, total: 0, isAll: false }),
      };
    }

    const requestedPeopleGroupId = query.peopleGroupId ?? null;
    const effectivePeopleGroupIds =
      requestedPeopleGroupId === null
        ? projectPeopleGroupIds
        : projectPeopleGroupIds.includes(requestedPeopleGroupId)
          ? [requestedPeopleGroupId]
          : [];

    if (effectivePeopleGroupIds.length === 0) {
      return {
        data: [],
        pagination: buildPaginationMeta({ page, limit, total: 0, isAll: false }),
      };
    }

    const q = normalizeString(query.q);
    const basePeopleWhere = buildPeopleWhere({ tenantId, query: undefined, filters });
    const where: Prisma.PersonWhereInput = {
      ...basePeopleWhere,
      peopleGroupParticipations: {
        some: {
          tenantId,
          peopleGroupId: { in: effectivePeopleGroupIds },
          isActive: true,
          deletedAt: null,
        },
      },
      projectEnrollments: {
        none: {
          tenantId,
          projectId,
          participationKind: 'PARTICIPANT',
          status: 'ACTIVE',
          deletedAt: null,
        },
      },
      ...(q
        ? {
            OR: [
              { fullName: { contains: q } },
              { socialName: { contains: q } },
              { status: { contains: q } },
              { personType: { contains: q } },
              {
                peopleGroupParticipations: {
                  some: {
                    peopleGroupId: { in: effectivePeopleGroupIds },
                    peopleGroup: { name: { contains: q } },
                  },
                },
              },
              {
                peopleGroupParticipations: {
                  some: {
                    peopleGroupId: { in: effectivePeopleGroupIds },
                    peopleGroup: { category: { contains: q } },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.person.findMany({
        where,
        select: {
          id: true,
          tenantId: true,
          fullName: true,
          socialName: true,
          birthDate: true,
          sex: true,
          gender: true,
          raceColor: true,
          maritalStatus: true,
          nationality: true,
          email: true,
          phone: true,
          document: true,
          rg: true,
          nis: true,
          status: true,
          personType: true,
          departureReason: true,
          notes: true,
          tags: true,
          profileSummary: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
          peopleGroupParticipations: {
            where: {
              tenantId,
              peopleGroupId: { in: effectivePeopleGroupIds },
              isActive: true,
              deletedAt: null,
            },
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
        orderBy: [{ fullName: 'asc' }],
        skip,
        take,
      }),
      this.prisma.person.count({ where }),
    ]);

    return {
      data: data.map((person) => ({
        ...person,
        eligiblePeopleGroups: person.peopleGroupParticipations
          .map((participation) => participation.peopleGroup)
          .filter((peopleGroup) => Boolean(peopleGroup)),
        eligibleSegments: person.peopleGroupParticipations
          .map((participation) => participation.peopleGroup)
          .filter((peopleGroup) => Boolean(peopleGroup)),
        hasHealthCondition: (person._count.healthConditions ?? 0) > 0,
        hasMedication: (person._count.medications ?? 0) > 0,
        peopleGroupParticipations: undefined,
        _count: undefined,
      })),
      pagination: buildPaginationMeta({ page, limit, total, isAll: false }),
    };
  }

  private async listEligiblePeopleByLegacySegments(
    tenantId: string,
    projectId: string,
    page: number,
    limit: number,
    skip: number,
    take: number,
    rawQuery: string | undefined,
    effectiveSegmentIds: string[],
    rawFilters?: string,
  ) {
    if (effectiveSegmentIds.length === 0) {
      return {
        data: [],
        pagination: buildPaginationMeta({ page, limit, total: 0, isAll: false }),
      };
    }
    const q = normalizeString(rawQuery);
    const filters = parseAdvancedFilters(rawFilters);
    const basePeopleWhere = buildPeopleWhere({ tenantId, query: undefined, filters });
    const where: Prisma.PersonWhereInput = {
      ...basePeopleWhere,
      peopleSegmentMemberships: {
        some: {
          tenantId,
          segmentId: { in: effectiveSegmentIds },
          isActive: true,
          deletedAt: null,
        },
      },
      projectEnrollments: {
        none: {
          tenantId,
          projectId,
          participationKind: 'PARTICIPANT',
          status: 'ACTIVE',
          deletedAt: null,
        },
      },
      ...(q
        ? {
            OR: [
              { fullName: { contains: q } },
              { socialName: { contains: q } },
              { status: { contains: q } },
              { personType: { contains: q } },
              {
                peopleSegmentMemberships: {
                  some: { segmentId: { in: effectiveSegmentIds }, segment: { name: { contains: q } } },
                },
              },
              {
                peopleSegmentMemberships: {
                  some: { segmentId: { in: effectiveSegmentIds }, segment: { category: { contains: q } } },
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.person.findMany({
        where,
        select: {
          id: true,
          tenantId: true,
          fullName: true,
          socialName: true,
          birthDate: true,
          sex: true,
          gender: true,
          raceColor: true,
          maritalStatus: true,
          nationality: true,
          email: true,
          phone: true,
          document: true,
          rg: true,
          nis: true,
          status: true,
          personType: true,
          departureReason: true,
          notes: true,
          tags: true,
          profileSummary: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
          peopleSegmentMemberships: {
            where: {
              tenantId,
              segmentId: { in: effectiveSegmentIds },
              isActive: true,
              deletedAt: null,
            },
            select: {
              segment: {
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
        orderBy: [{ fullName: 'asc' }],
        skip,
        take,
      }),
      this.prisma.person.count({ where }),
    ]);

    return {
      data: data.map((person) => ({
        ...person,
        eligibleSegments: person.peopleSegmentMemberships
          .map((membership) => membership.segment)
          .filter((segment) => Boolean(segment)),
        hasHealthCondition: (person._count.healthConditions ?? 0) > 0,
        hasMedication: (person._count.medications ?? 0) > 0,
        peopleSegmentMemberships: undefined,
        _count: undefined,
      })),
      pagination: buildPaginationMeta({ page, limit, total, isAll: false }),
    };
  }

  private async ensurePersonBelongsToTenant(tenantId: string, personId: string) {
    const person = await this.prisma.person.findFirst({
      where: { id: personId, tenantId },
      select: { id: true },
    });
    if (!person) throw new BadRequestException('Pessoa invÃ¡lida');
  }

  private async ensureGroupBelongsToProject(
    tenantId: string,
    projectId: string,
    groupId: string,
  ) {
    const group = await this.prisma.projectGroup.findFirst({
      where: { id: groupId, tenantId, projectId },
      select: { id: true },
    });
    if (!group) throw new BadRequestException('Grupo invÃ¡lido');
  }

  private async ensureEnrollmentBelongsToProject(params: {
    tenantId: string;
    projectId: string;
    enrollmentId: string;
  }) {
    const enrollment = await this.prisma.projectEnrollment.findFirst({
      where: {
        id: params.enrollmentId,
        tenantId: params.tenantId,
        projectId: params.projectId,
        deletedAt: null,
      },
      select: { id: true, personId: true },
    });
    if (!enrollment) throw new NotFoundException('MatrÃ­cula nÃ£o encontrada');
    return enrollment;
  }

  async addEnrollmentToGroup(
    tenantId: string,
    projectId: string,
    enrollmentId: string,
    groupId: string,
  ) {
    await this.ensureProjectExists(tenantId, projectId);
    await this.ensureGroupBelongsToProject(tenantId, projectId, groupId);
    await this.ensureEnrollmentBelongsToProject({ tenantId, projectId, enrollmentId });

    const existing = await this.prisma.projectEnrollmentGroupMembership.findFirst({
      where: { tenantId, enrollmentId, groupId, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      return { ok: true as const };
    }

    try {
      await this.prisma.projectEnrollmentGroupMembership.create({
        data: {
          tenantId,
          enrollmentId,
          groupId,
          activeKey: `${enrollmentId}:${groupId}`,
          isActive: true,
          startsAt: new Date(),
          deletedAt: null,
        },
      });
    } catch (err) {
      if (err && typeof err === 'object' && 'code' in err && (err as any).code === 'P2002') {
        return { ok: true as const };
      }
      throw err;
    }

    return { ok: true as const };
  }

  async removeEnrollmentFromGroup(
    tenantId: string,
    projectId: string,
    enrollmentId: string,
    groupId: string,
  ) {
    await this.ensureProjectExists(tenantId, projectId);
    await this.ensureGroupBelongsToProject(tenantId, projectId, groupId);
    await this.ensureEnrollmentBelongsToProject({ tenantId, projectId, enrollmentId });

    await this.prisma.projectEnrollmentGroupMembership.updateMany({
      where: { tenantId, enrollmentId, groupId, isActive: true, deletedAt: null },
      data: {
        activeKey: null,
        isActive: false,
        endsAt: new Date(),
        deletedAt: new Date(),
      },
    });

    return { ok: true as const };
  }

  private async ensureNoActiveEnrollment(params: {
    tenantId: string;
    projectId: string;
    personId: string;
    excludeId?: string;
  }) {
    const existing = await this.prisma.projectEnrollment.findFirst({
      where: {
        tenantId: params.tenantId,
        projectId: params.projectId,
        personId: params.personId,
        status: 'ACTIVE',
        deletedAt: null,
        ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      },
      select: { id: true, endsAt: true, deletedAt: true },
    });
    if (existing) {
      throw new BadRequestException(
        'Pessoa jÃ¡ estÃ¡ vinculada ao projeto (matrÃ­cula ativa).',
      );
    }
  }

  async createEnrollment(
    tenantId: string,
    projectId: string,
    dto: CreateProjectEnrollmentDto,
  ) {
    await this.ensureProjectExists(tenantId, projectId);
    await this.ensurePersonBelongsToTenant(tenantId, dto.personId);

    const endsAt = parseDateInput(dto.endsAt);
    const today = new Date().toISOString().slice(0, 10);
    const defaultStartsAt = parseDateInput(today);
    const startsAt = parseDateInput(dto.startsAt) ?? endsAt ?? defaultStartsAt;
    ensureValidPeriod({ startsAt, endsAt });

    const status: EnrollmentStatus = dto.status ?? 'ACTIVE';
    const role: ProjectParticipationRole = dto.role ?? 'PUBLICO_ATENDIDO';
    const participationKind: ParticipationKind = dto.participationKind ?? 'PARTICIPANT';
    if (status === 'ACTIVE') {
      await this.ensureNoActiveEnrollment({
        tenantId,
        projectId,
        personId: dto.personId,
      });
    }

    const enrollment = await this.prisma.projectEnrollment.create({
      data: {
        tenantId,
        projectId,
        personId: dto.personId,
        status,
        participationKind,
        role,
        startsAt,
        endsAt,
        deletedAt: null,
      },
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
    });

    return this.serializeEnrollment(enrollment);
  }

  async updateEnrollment(
    tenantId: string,
    projectId: string,
    enrollmentId: string,
    dto: UpdateProjectEnrollmentDto,
  ) {
    const existing = await this.prisma.projectEnrollment.findFirst({
      where: { id: enrollmentId, tenantId, projectId },
    });
    if (!existing) throw new NotFoundException('MatrÃ­cula nÃ£o encontrada');
    if (existing.deletedAt) throw new NotFoundException('MatrÃ­cula nÃ£o encontrada');

    const startsAt =
      dto.startsAt === undefined
        ? existing.startsAt
        : dto.startsAt === null
          ? null
          : (parseDateInput(dto.startsAt) ?? null);
    const endsAt =
      dto.endsAt === undefined
        ? existing.endsAt
        : dto.endsAt === null
          ? null
          : (parseDateInput(dto.endsAt) ?? null);

    const nextStatus: EnrollmentStatus | undefined =
      dto.status !== undefined ? dto.status : undefined;

    const shouldAutoSetEndsAt =
      nextStatus === 'ENDED' &&
      dto.endsAt === undefined &&
      (existing.endsAt === null || existing.endsAt === undefined);
    const resolvedEndsAt = shouldAutoSetEndsAt
      ? (parseDateInput(new Date().toISOString().slice(0, 10), {
          endOfDay: true,
        }) ?? null)
      : endsAt;

    ensureValidPeriod({ startsAt, endsAt: resolvedEndsAt });
    if (nextStatus === 'ACTIVE') {
      await this.ensureNoActiveEnrollment({
        tenantId,
        projectId,
        personId: existing.personId,
        excludeId: existing.id,
      });
    }

    const shouldUpdateEndsAt = dto.endsAt !== undefined || shouldAutoSetEndsAt;

    const enrollment = await this.prisma.projectEnrollment.update({
      where: { id: existing.id },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.participationKind !== undefined
          ? { participationKind: dto.participationKind }
          : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.startsAt !== undefined ? { startsAt } : {}),
        ...(shouldUpdateEndsAt ? { endsAt: resolvedEndsAt } : {}),
      },
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
    });

    return this.serializeEnrollment(enrollment);
  }

  async deleteEnrollment(tenantId: string, projectId: string, enrollmentId: string) {
    const existing = await this.prisma.projectEnrollment.findFirst({
      where: { id: enrollmentId, tenantId, projectId },
      select: { id: true, endsAt: true, deletedAt: true },
    });
    if (!existing) throw new NotFoundException('MatrÃ­cula nÃ£o encontrada');

    if (existing.deletedAt) {
      return { ok: true as const };
    }

    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.projectEnrollmentGroupMembership.updateMany({
        where: { tenantId, enrollmentId: existing.id, isActive: true, deletedAt: null },
        data: {
          activeKey: null,
          isActive: false,
          endsAt: now,
          deletedAt: now,
        },
      }),
      this.prisma.projectEnrollment.update({
        where: { id: existing.id },
        data: {
          status: 'ENDED',
          endsAt: existing.endsAt ?? now,
          deletedAt: now,
        },
      }),
    ]);
    return { ok: true as const };
  }
}


