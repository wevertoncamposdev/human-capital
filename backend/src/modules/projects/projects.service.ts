import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, ProgramType, ProjectStatus } from '../../generated/prisma';
import { PrismaService } from '../../core/prisma/prisma.service';
import { parseDateInput } from '../../core/utils/dates';
import { buildPaginationMeta, resolvePagination } from '../../core/utils/pagination';
import { normalizeString } from '../../core/utils/strings';
import { CreateProjectAttachmentDto } from './dto/create-project-attachment.dto';
import { CreateProjectCommentDto } from './dto/create-project-comment.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { ListProjectsQueryDto } from './dto/list-projects-query.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;
const PROJECT_STATUS_SEARCH_MAP: Record<string, ProjectStatus[]> = {
  planned: ['PLANNED'],
  planejado: ['PLANNED'],
  planejados: ['PLANNED'],
  active: ['ACTIVE'],
  ativo: ['ACTIVE'],
  ativos: ['ACTIVE'],
  closed: ['CLOSED'],
  encerrado: ['CLOSED'],
  encerrados: ['CLOSED'],
};
const PROGRAM_TYPE_SEARCH_MAP: Record<string, ProgramType[]> = {
  scfv: ['SCFV'],
  paif: ['PAIF'],
  paefi: ['PAEFI'],
  cultural: ['CULTURAL'],
  cultura: ['CULTURAL'],
  qualification: ['QUALIFICATION'],
  qualificacao: ['QUALIFICATION'],
  other: ['OTHER'],
  outro: ['OTHER'],
  outros: ['OTHER'],
};

function normalizeTags(tags?: string[] | null) {
  if (!tags) return null;
  const cleaned = Array.from(
    new Set(tags.map((tag) => tag.trim()).filter(Boolean)),
  );
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
  return Array.from(
    new Set(value.map((entry) => String(entry ?? '').trim()).filter(Boolean)),
  );
}

const mapCommentAuthor = (
  user:
    | {
        id: string;
        name: string | null;
        email: string | null;
        avatarUrl: string | null;
      }
    | null
    | undefined,
) => ({
  id: user?.id ?? null,
  name: user?.name?.trim() || user?.email || 'Equipe interna',
  email: user?.email ?? null,
  avatarUrl: user?.avatarUrl ?? null,
});

const mapProjectCommentItem = (
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
      avatarUrl: string | null;
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

const mapProjectAttachmentItem = (
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
      avatarUrl: string | null;
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

function serializeProject(project: {
  tags: string | null;
  comments?: Array<{
    id: string;
    body: string;
    mentionUserIds: Prisma.JsonValue | null;
    createdAt: Date;
    updatedAt: Date;
    authorUser?: {
      id: string;
      name: string | null;
      email: string | null;
      avatarUrl: string | null;
    } | null;
  }>;
  attachments?: Array<{
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
      avatarUrl: string | null;
    } | null;
  }>;
}) {
  return {
    ...project,
    tags: parseTags(project.tags),
    comments: project.comments?.map(mapProjectCommentItem) ?? [],
    attachments: project.attachments?.map(mapProjectAttachmentItem) ?? [],
  };
}

function resolveMatchingProjectStatuses(query: string): ProjectStatus[] {
  const tokens = query
    .split(/\s+/)
    .map((token) => normalizeString(token))
    .filter(Boolean);
  const matches = new Set<ProjectStatus>();
  for (const token of tokens) {
    if (!token) continue;
    for (const status of PROJECT_STATUS_SEARCH_MAP[token] ?? []) {
      matches.add(status);
    }
  }
  return Array.from(matches);
}

function resolveMatchingProgramTypes(query: string): ProgramType[] {
  const tokens = query
    .split(/\s+/)
    .map((token) => normalizeString(token))
    .filter(Boolean);
  const matches = new Set<ProgramType>();
  for (const token of tokens) {
    if (!token) continue;
    for (const type of PROGRAM_TYPE_SEARCH_MAP[token] ?? []) {
      matches.add(type);
    }
  }
  return Array.from(matches);
}

function ensureValidPeriod(params: { startsAt?: Date | null; endsAt?: Date | null }) {
  const startsAt = params.startsAt ?? null;
  const endsAt = params.endsAt ?? null;
  if (startsAt && endsAt && startsAt > endsAt) {
    throw new BadRequestException('Período inválido: início maior que término');
  }
}

function resolveRangeDates(params: { from?: string; to?: string }) {
  const from = parseDateInput(params.from);
  const to = parseDateInput(params.to);
  if (from && to && from > to) {
    throw new BadRequestException('Intervalo de datas inválido');
  }
  return { from, to };
}

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async listProjects(tenantId: string, query: ListProjectsQueryDto) {
    const { page, limit, skip, take, isAll } = resolvePagination({
      page: query.page,
      limit: query.limit,
      all: query.all,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    });

    const q = normalizeString(query.q);
    const matchingStatuses = q ? resolveMatchingProjectStatuses(q) : [];
    const matchingProgramTypes = q ? resolveMatchingProgramTypes(q) : [];
    const searchedDate = query.q ? parseDateInput(query.q) : null;
    const { from, to } = resolveRangeDates({ from: query.from, to: query.to });

    const where: Prisma.ProjectWhereInput = {
      tenantId,
      ...(query.programId ? { programId: query.programId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { description: { contains: q } },
              { tags: { contains: q } },
              { internalNotes: { contains: q } },
              { status: { in: matchingStatuses } },
              ...(searchedDate
                ? [{ startsAt: { equals: searchedDate } }, { endsAt: { equals: searchedDate } }]
                : []),
              { program: { name: { contains: q } } },
              { program: { type: { in: matchingProgramTypes } } },
            ],
          }
        : {}),
      ...(from ? { startsAt: { gte: from } } : {}),
      ...(to ? { endsAt: { lte: to } } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        include: {
          program: { select: { id: true, name: true, type: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        ...(isAll ? {} : { skip, take }),
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      data: data.map((project) => serializeProject(project)),
      pagination: buildPaginationMeta({ page, limit, total, isAll }),
    };
  }

  async getProject(tenantId: string, id: string) {
    return this.findById(tenantId, id);
  }

  private async findById(tenantId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId },
      include: {
        program: { select: { id: true, name: true, type: true, status: true } },
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
    if (!project) throw new NotFoundException('Projeto não encontrado');
    return serializeProject(project);
  }

  private async findProjectEntity(tenantId: string, id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Projeto nÃ£o encontrado');
    return project;
  }

  private async ensureProgramBelongsToTenant(tenantId: string, programId: string) {
    const program = await this.prisma.program.findFirst({
      where: { id: programId, tenantId },
      select: { id: true },
    });
    if (!program) throw new BadRequestException('Programa inválido');
  }

  async createProject(tenantId: string, dto: CreateProjectDto) {
    const name = (dto.name ?? '').trim();
    if (!name) throw new BadRequestException('Nome é obrigatório');

    await this.ensureProgramBelongsToTenant(tenantId, dto.programId);

    const startsAt = parseDateInput(dto.startsAt);
    const endsAt = parseDateInput(dto.endsAt);
    ensureValidPeriod({ startsAt, endsAt });

    const created = await this.prisma.project.create({
      data: {
        tenantId,
        programId: dto.programId,
        name,
        description: dto.description?.trim() ? dto.description.trim() : null,
        tags: normalizeTags(dto.tags),
        internalNotes: dto.internalNotes?.trim() ? dto.internalNotes.trim() : null,
        status: dto.status ?? 'PLANNED',
        startsAt,
        endsAt,
      },
      include: {
        program: { select: { id: true, name: true, type: true, status: true } },
      },
    });

    return this.findById(tenantId, created.id);
  }

  async updateProject(tenantId: string, id: string, dto: UpdateProjectDto) {
    const existing = await this.prisma.project.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Projeto não encontrado');

    if (dto.programId !== undefined) {
      await this.ensureProgramBelongsToTenant(tenantId, dto.programId);
    }

    const name =
      dto.name !== undefined ? (dto.name ?? '').trim() : undefined;
    if (name !== undefined && !name) {
      throw new BadRequestException('Nome é obrigatório');
    }

    const startsAt =
      dto.startsAt !== undefined ? parseDateInput(dto.startsAt) : existing.startsAt;
    const endsAt =
      dto.endsAt !== undefined ? parseDateInput(dto.endsAt) : existing.endsAt;
    ensureValidPeriod({ startsAt, endsAt });

    const updated = await this.prisma.project.update({
      where: { id: existing.id },
      data: {
        ...(dto.programId !== undefined ? { programId: dto.programId } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() ? dto.description.trim() : null }
          : {}),
        ...(dto.tags !== undefined ? { tags: normalizeTags(dto.tags) } : {}),
        ...(dto.internalNotes !== undefined
          ? {
              internalNotes: dto.internalNotes?.trim()
                ? dto.internalNotes.trim()
                : null,
            }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.startsAt !== undefined ? { startsAt } : {}),
        ...(dto.endsAt !== undefined ? { endsAt } : {}),
      },
      include: {
        program: { select: { id: true, name: true, type: true, status: true } },
      },
    });

    return this.findById(tenantId, updated.id);
  }

  async deleteProject(tenantId: string, id: string) {
    const existing = await this.prisma.project.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Projeto não encontrado');

    const [groupsCount, enrollmentsCount] =
      await this.prisma.$transaction([
        this.prisma.projectGroup.count({
          where: { tenantId, projectId: existing.id },
        }),
        this.prisma.projectEnrollment.count({
          where: { tenantId, projectId: existing.id },
        }),
      ]);

    if (groupsCount > 0 || enrollmentsCount > 0) {
      throw new BadRequestException(
        'Não é possível excluir o projeto: existem grupos/ciclos/participantes vinculados',
      );
    }

    await this.prisma.project.delete({ where: { id: existing.id } });
    return { ok: true as const };
  }

  async addComment(
    tenantId: string,
    actorUserId: string,
    projectId: string,
    dto: CreateProjectCommentDto,
  ) {
    await this.findProjectEntity(tenantId, projectId);
    const body = dto.body.trim();
    if (!body) {
      throw new BadRequestException('Informe um comentario.');
    }

    const mentionUserIds = await this.resolveMentionUserIds(tenantId, dto.mentionUserIds);

    await this.prisma.projectComment.create({
      data: {
        tenantId,
        projectId,
        authorUserId: actorUserId,
        body,
        mentionUserIds,
      },
    });

    return this.findById(tenantId, projectId);
  }

  async deleteComment(tenantId: string, projectId: string, commentId: string) {
    await this.findProjectEntity(tenantId, projectId);
    const comment = await this.prisma.projectComment.findFirst({
      where: { id: commentId, tenantId, projectId },
      select: { id: true },
    });
    if (!comment) {
      throw new NotFoundException('Comentario nao encontrado');
    }

    await this.prisma.projectComment.delete({ where: { id: comment.id } });
    return this.findById(tenantId, projectId);
  }

  async addAttachment(
    tenantId: string,
    actorUserId: string,
    projectId: string,
    dto: CreateProjectAttachmentDto,
  ) {
    await this.findProjectEntity(tenantId, projectId);
    const label = dto.label.trim();
    const filePath = dto.filePath.trim();

    if (!label) {
      throw new BadRequestException('Informe um nome para o anexo.');
    }

    if (!filePath.startsWith('/uploads/projects/')) {
      throw new BadRequestException('Caminho de anexo invalido.');
    }

    await this.prisma.projectAttachment.create({
      data: {
        tenantId,
        projectId,
        uploadedByUserId: actorUserId,
        label,
        filePath,
        mimeType: normalizeString(dto.mimeType),
        fileSizeBytes: dto.fileSizeBytes ?? null,
      },
    });

    return this.findById(tenantId, projectId);
  }

  async deleteAttachment(
    tenantId: string,
    projectId: string,
    attachmentId: string,
  ) {
    await this.findProjectEntity(tenantId, projectId);
    const attachment = await this.prisma.projectAttachment.findFirst({
      where: { id: attachmentId, tenantId, projectId },
      select: { id: true },
    });
    if (!attachment) {
      throw new NotFoundException('Anexo nao encontrado');
    }

    await this.prisma.projectAttachment.delete({ where: { id: attachment.id } });
    return this.findById(tenantId, projectId);
  }

  private async resolveMentionUserIds(
    tenantId: string,
    mentionUserIds?: string[] | null,
  ) {
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
