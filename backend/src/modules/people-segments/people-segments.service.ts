import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma';
import { PrismaService } from '../../core/prisma/prisma.service';
import { buildPaginationMeta, resolvePagination } from '../../core/utils/pagination';
import { normalizeString } from '../../core/utils/strings';
import { CreatePeopleSegmentMembershipDto } from './dto/create-people-segment-membership.dto';
import { CreatePeopleSegmentDto } from './dto/create-people-segment.dto';
import { EndPeopleSegmentMembershipDto } from './dto/end-people-segment-membership.dto';
import { ListPeopleSegmentMembershipsQueryDto } from './dto/list-people-segment-memberships-query.dto';
import { ListPeopleSegmentsQueryDto } from './dto/list-people-segments-query.dto';
import { UpdatePeopleSegmentDto } from './dto/update-people-segment.dto';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;

function ensureValidAgeRange(params: { ageMin?: number | null; ageMax?: number | null }) {
  const ageMin = params.ageMin ?? null;
  const ageMax = params.ageMax ?? null;
  if (ageMin !== null && ageMax !== null && ageMin > ageMax) {
    throw new BadRequestException('Faixa etaria invalida: minima maior que maxima');
  }
}

function buildActiveMembershipKey(segmentId: string, personId: string) {
  return `${segmentId}:${personId}`;
}

@Injectable()
export class PeopleSegmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPeopleSegments(tenantId: string, query: ListPeopleSegmentsQueryDto) {
    const { page, limit, skip, take, isAll } = resolvePagination({
      page: query.page,
      limit: query.limit,
      all: query.all,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    });

    const q = normalizeString(query.q);
    const numericQ = q && /^\d+$/.test(q) ? Number(q) : null;

    const where: Prisma.PeopleSegmentWhereInput = {
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
      ...(query.category ? { category: query.category.trim() } : {}),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.ageMin !== undefined
        ? { OR: [{ ageMin: null }, { ageMin: { gte: query.ageMin } }] }
        : {}),
      ...(query.ageMax !== undefined
        ? { OR: [{ ageMax: null }, { ageMax: { lte: query.ageMax } }] }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.peopleSegment.findMany({
        where,
        include: {
          _count: {
            select: {
              memberships: {
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
      this.prisma.peopleSegment.count({ where }),
    ]);

    return {
      data,
      pagination: buildPaginationMeta({ page, limit, total, isAll }),
    };
  }

  async getPeopleSegment(tenantId: string, id: string) {
    const segment = await this.prisma.peopleSegment.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: {
            memberships: {
              where: {
                isActive: true,
                deletedAt: null,
              },
            },
          },
        },
      },
    });
    if (!segment) throw new NotFoundException('Segmento nao encontrado');
    return segment;
  }

  async createPeopleSegment(tenantId: string, dto: CreatePeopleSegmentDto) {
    const name = (dto.name ?? '').trim();
    if (!name) throw new BadRequestException('Nome e obrigatorio');

    ensureValidAgeRange({ ageMin: dto.ageMin, ageMax: dto.ageMax });

    return this.prisma.peopleSegment.create({
      data: {
        tenantId,
        name,
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
            memberships: {
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

  async updatePeopleSegment(tenantId: string, id: string, dto: UpdatePeopleSegmentDto) {
    const existing = await this.prisma.peopleSegment.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Segmento nao encontrado');

    const name = dto.name !== undefined ? (dto.name ?? '').trim() : undefined;
    if (name !== undefined && !name) {
      throw new BadRequestException('Nome e obrigatorio');
    }

    const ageMin = dto.ageMin !== undefined ? dto.ageMin : existing.ageMin;
    const ageMax = dto.ageMax !== undefined ? dto.ageMax : existing.ageMax;
    ensureValidAgeRange({ ageMin, ageMax });

    return this.prisma.peopleSegment.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined ? { name } : {}),
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
            memberships: {
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

  async deletePeopleSegment(tenantId: string, id: string) {
    const existing = await this.prisma.peopleSegment.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Segmento nao encontrado');

    const activeMemberships = await this.prisma.peopleSegmentMembership.count({
      where: { tenantId, segmentId: existing.id, isActive: true, deletedAt: null },
    });
    if (activeMemberships > 0) {
      throw new BadRequestException(
        'Nao e possivel excluir o segmento: existem people vinculadas ativamente',
      );
    }

    await this.prisma.peopleSegment.delete({ where: { id: existing.id } });
    return { ok: true as const };
  }

  async listPeopleSegmentMemberships(
    tenantId: string,
    segmentId: string,
    query: ListPeopleSegmentMembershipsQueryDto,
  ) {
    await this.assertSegmentExists(tenantId, segmentId);

    const { page, limit, skip, take, isAll } = resolvePagination({
      page: query.page,
      limit: query.limit,
      all: query.all,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    });

    const q = normalizeString(query.q);
    const where: Prisma.PeopleSegmentMembershipWhereInput = {
      tenantId,
      segmentId,
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
      this.prisma.peopleSegmentMembership.findMany({
        where,
        include: {
          person: true,
        },
        orderBy: [{ isActive: 'desc' }, { startsAt: 'desc' }, { createdAt: 'desc' }],
        ...(isAll ? {} : { skip, take }),
      }),
      this.prisma.peopleSegmentMembership.count({ where }),
    ]);

    return {
      data,
      pagination: buildPaginationMeta({ page, limit, total, isAll }),
    };
  }

  async createPeopleSegmentMembership(
    tenantId: string,
    segmentId: string,
    dto: CreatePeopleSegmentMembershipDto,
  ) {
    await this.assertSegmentExists(tenantId, segmentId);

    const personId = (dto.personId ?? '').trim();
    if (!personId) {
      throw new BadRequestException('personId e obrigatorio');
    }

    const person = await this.prisma.person.findFirst({
      where: { id: personId, tenantId },
      select: { id: true },
    });
    if (!person) throw new NotFoundException('Pessoa nao encontrada');

    const activeKey = buildActiveMembershipKey(segmentId, personId);
    const existingActive = await this.prisma.peopleSegmentMembership.findFirst({
      where: { tenantId, activeKey, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (existingActive) {
      throw new BadRequestException('A pessoa ja participa deste segmento');
    }

    return this.prisma.peopleSegmentMembership.create({
      data: {
        tenantId,
        segmentId,
        personId,
        activeKey,
        isActive: true,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : new Date(),
        internalNotes: dto.internalNotes?.trim() ? dto.internalNotes.trim() : null,
      },
      include: {
        person: true,
      },
    });
  }

  async endPeopleSegmentMembership(
    tenantId: string,
    segmentId: string,
    membershipId: string,
    dto: EndPeopleSegmentMembershipDto,
  ) {
    const membership = await this.prisma.peopleSegmentMembership.findFirst({
      where: { id: membershipId, tenantId, segmentId },
      include: { person: true },
    });
    if (!membership) throw new NotFoundException('Vinculo do segmento nao encontrado');

    if (!membership.isActive || membership.deletedAt) {
      return membership;
    }

    return this.prisma.peopleSegmentMembership.update({
      where: { id: membership.id },
      data: {
        isActive: false,
        activeKey: null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : new Date(),
        deletedAt: new Date(),
        ...(dto.internalNotes !== undefined
          ? {
              internalNotes: dto.internalNotes?.trim()
                ? dto.internalNotes.trim()
                : membership.internalNotes,
            }
          : {}),
      },
      include: {
        person: true,
      },
    });
  }

  private async assertSegmentExists(tenantId: string, segmentId: string) {
    const segment = await this.prisma.peopleSegment.findFirst({
      where: { id: segmentId, tenantId },
      select: { id: true },
    });
    if (!segment) throw new NotFoundException('Segmento nao encontrado');
    return segment;
  }
}
