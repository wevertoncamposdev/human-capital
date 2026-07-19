import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma';
import { PrismaService } from '../../core/prisma/prisma.service';
import { buildPaginationMeta, resolvePagination } from '../../core/utils/pagination';
import { normalizeString } from '../../core/utils/strings';
import { CreatePeopleGroupParticipationDto } from './dto/create-people-group-participation.dto';
import { CreatePeopleGroupDto } from './dto/create-people-group.dto';
import { EndPeopleGroupParticipationDto } from './dto/end-people-group-participation.dto';
import { ListPeopleGroupParticipationsQueryDto } from './dto/list-people-group-participations-query.dto';
import { ListPeopleGroupsQueryDto } from './dto/list-people-groups-query.dto';
import { UpdatePeopleGroupDto } from './dto/update-people-group.dto';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;

function ensureValidAgeRange(params: { ageMin?: number | null; ageMax?: number | null }) {
  const ageMin = params.ageMin ?? null;
  const ageMax = params.ageMax ?? null;
  if (ageMin !== null && ageMax !== null && ageMin > ageMax) {
    throw new BadRequestException('Faixa etaria invalida: minima maior que maxima');
  }
}

function buildActiveParticipationKey(peopleGroupId: string, personId: string) {
  return `${peopleGroupId}:${personId}`;
}

@Injectable()
export class PeopleGroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPeopleGroups(tenantId: string, query: ListPeopleGroupsQueryDto) {
    const { page, limit, skip, take, isAll } = resolvePagination({
      page: query.page,
      limit: query.limit,
      all: query.all,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    });

    const q = normalizeString(query.q);
    const numericQ = q && /^\d+$/.test(q) ? Number(q) : null;

    const where: Prisma.PeopleGroupWhereInput = {
      tenantId,
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { category: { contains: q } },
              { description: { contains: q } },
              { internalNotes: { contains: q } },
              ...(numericQ === null ? [] : [{ ageMin: numericQ }, { ageMax: numericQ }]),
            ],
          }
        : {}),
      ...(query.groupType ? { groupType: query.groupType } : {}),
      ...(query.purpose ? { purpose: query.purpose } : {}),
      ...(query.category ? { category: query.category.trim() } : {}),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.peopleGroup.findMany({
        where,
        include: {
          _count: {
            select: {
              participations: {
                where: {
                  isActive: true,
                  deletedAt: null,
                },
              },
            },
          },
        },
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        ...(isAll ? {} : { skip, take }),
      }),
      this.prisma.peopleGroup.count({ where }),
    ]);

    return {
      data,
      pagination: buildPaginationMeta({ page, limit, total, isAll }),
    };
  }

  async getPeopleGroup(tenantId: string, id: string) {
    const group = await this.prisma.peopleGroup.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: {
            participations: {
              where: {
                isActive: true,
                deletedAt: null,
              },
            },
          },
        },
      },
    });
    if (!group) throw new NotFoundException('Grupo de pessoas nao encontrado');
    return group;
  }

  async createPeopleGroup(tenantId: string, dto: CreatePeopleGroupDto) {
    const name = (dto.name ?? '').trim();
    if (!name) throw new BadRequestException('Nome e obrigatorio');
    ensureValidAgeRange(dto);

    return this.prisma.peopleGroup.create({
      data: {
        tenantId,
        name,
        groupType: dto.groupType ?? 'SEGMENT',
        purpose: dto.purpose ?? (dto.groupType === 'TEAM_POOL' ? 'EQUIPE' : 'PUBLICO'),
        category: dto.category?.trim() ? dto.category.trim() : null,
        description: dto.description?.trim() ? dto.description.trim() : null,
        ageMin: dto.ageMin ?? null,
        ageMax: dto.ageMax ?? null,
        isActive: dto.isActive ?? true,
        internalNotes: dto.internalNotes?.trim() ? dto.internalNotes.trim() : null,
      },
      include: {
        _count: {
          select: {
            participations: {
              where: {
                isActive: true,
                deletedAt: null,
              },
            },
          },
        },
      },
    });
  }

  async updatePeopleGroup(tenantId: string, id: string, dto: UpdatePeopleGroupDto) {
    const existing = await this.prisma.peopleGroup.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Grupo de pessoas nao encontrado');

    const name = dto.name !== undefined ? (dto.name ?? '').trim() : undefined;
    if (name !== undefined && !name) {
      throw new BadRequestException('Nome e obrigatorio');
    }

    ensureValidAgeRange({
      ageMin: dto.ageMin !== undefined ? dto.ageMin : existing.ageMin,
      ageMax: dto.ageMax !== undefined ? dto.ageMax : existing.ageMax,
    });

    return this.prisma.peopleGroup.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(dto.groupType !== undefined ? { groupType: dto.groupType } : {}),
        ...(dto.purpose !== undefined ? { purpose: dto.purpose } : {}),
        ...(dto.category !== undefined
          ? { category: dto.category?.trim() ? dto.category.trim() : null }
          : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() ? dto.description.trim() : null }
          : {}),
        ...(dto.ageMin !== undefined ? { ageMin: dto.ageMin ?? null } : {}),
        ...(dto.ageMax !== undefined ? { ageMax: dto.ageMax ?? null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.internalNotes !== undefined
          ? { internalNotes: dto.internalNotes?.trim() ? dto.internalNotes.trim() : null }
          : {}),
      },
      include: {
        _count: {
          select: {
            participations: {
              where: {
                isActive: true,
                deletedAt: null,
              },
            },
          },
        },
      },
    });
  }

  async deletePeopleGroup(tenantId: string, id: string) {
    const existing = await this.prisma.peopleGroup.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Grupo de pessoas nao encontrado');

    const [activeParticipations, projectUses, actionUses] = await this.prisma.$transaction([
      this.prisma.peopleGroupParticipation.count({
        where: { tenantId, peopleGroupId: existing.id, isActive: true, deletedAt: null },
      }),
      this.prisma.projectPeopleGroup.count({ where: { tenantId, peopleGroupId: existing.id } }),
      this.prisma.actionPeopleGroup.count({ where: { tenantId, peopleGroupId: existing.id } }),
    ]);

    if (activeParticipations > 0 || projectUses > 0 || actionUses > 0) {
      throw new BadRequestException(
        'Nao e possivel excluir o grupo de pessoas: existem participacoes ou vinculos ativos',
      );
    }

    await this.prisma.peopleGroup.delete({ where: { id: existing.id } });
    return { ok: true as const };
  }

  async listPeopleGroupParticipations(
    tenantId: string,
    peopleGroupId: string,
    query: ListPeopleGroupParticipationsQueryDto,
  ) {
    await this.assertPeopleGroupExists(tenantId, peopleGroupId);

    const { page, limit, skip, take, isAll } = resolvePagination({
      page: query.page,
      limit: query.limit,
      all: query.all,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    });

    const q = normalizeString(query.q);
    const where: Prisma.PeopleGroupParticipationWhereInput = {
      tenantId,
      peopleGroupId,
      ...(query.isActive === undefined
        ? {}
        : query.isActive
          ? { isActive: true, deletedAt: null }
          : { isActive: false }),
      ...(q
        ? {
            OR: [
              { person: { fullName: { contains: q } } },
              { person: { socialName: { contains: q } } },
              { person: { status: { contains: q } } },
              { person: { personType: { contains: q } } },
              { internalNotes: { contains: q } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.peopleGroupParticipation.findMany({
        where,
        include: { person: true },
        orderBy: [{ isActive: 'desc' }, { startsAt: 'desc' }, { createdAt: 'desc' }],
        ...(isAll ? {} : { skip, take }),
      }),
      this.prisma.peopleGroupParticipation.count({ where }),
    ]);

    return {
      data,
      pagination: buildPaginationMeta({ page, limit, total, isAll }),
    };
  }

  async createPeopleGroupParticipation(
    tenantId: string,
    peopleGroupId: string,
    dto: CreatePeopleGroupParticipationDto,
  ) {
    await this.assertPeopleGroupExists(tenantId, peopleGroupId);

    const personId = (dto.personId ?? '').trim();
    if (!personId) {
      throw new BadRequestException('personId e obrigatorio');
    }

    const person = await this.prisma.person.findFirst({
      where: { id: personId, tenantId },
      select: { id: true },
    });
    if (!person) throw new NotFoundException('Pessoa nao encontrada');

    const activeKey = buildActiveParticipationKey(peopleGroupId, personId);
    const existingActive = await this.prisma.peopleGroupParticipation.findFirst({
      where: { tenantId, activeKey, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (existingActive) {
      throw new BadRequestException('A pessoa ja participa deste grupo');
    }

    return this.prisma.peopleGroupParticipation.create({
      data: {
        tenantId,
        peopleGroupId,
        personId,
        activeKey,
        isActive: true,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : new Date(),
        internalNotes: dto.internalNotes?.trim() ? dto.internalNotes.trim() : null,
      },
      include: { person: true },
    });
  }

  async endPeopleGroupParticipation(
    tenantId: string,
    peopleGroupId: string,
    participationId: string,
    dto: EndPeopleGroupParticipationDto,
  ) {
    const participation = await this.prisma.peopleGroupParticipation.findFirst({
      where: { id: participationId, tenantId, peopleGroupId },
      include: { person: true },
    });
    if (!participation) throw new NotFoundException('Participacao do grupo nao encontrada');

    if (!participation.isActive || participation.deletedAt) {
      return participation;
    }

    return this.prisma.peopleGroupParticipation.update({
      where: { id: participation.id },
      data: {
        isActive: false,
        activeKey: null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : new Date(),
        deletedAt: new Date(),
        ...(dto.internalNotes !== undefined
          ? {
              internalNotes: dto.internalNotes?.trim()
                ? dto.internalNotes.trim()
                : participation.internalNotes,
            }
          : {}),
      },
      include: { person: true },
    });
  }

  private async assertPeopleGroupExists(tenantId: string, peopleGroupId: string) {
    const peopleGroup = await this.prisma.peopleGroup.findFirst({
      where: { id: peopleGroupId, tenantId },
      select: { id: true },
    });
    if (!peopleGroup) throw new NotFoundException('Grupo de pessoas nao encontrado');
    return peopleGroup;
  }
}
