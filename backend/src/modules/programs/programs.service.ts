import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, ProgramStatus, ProgramType } from '../../generated/prisma';
import { PrismaService } from '../../core/prisma/prisma.service';
import { parseDateInput } from '../../core/utils/dates';
import { buildPaginationMeta, resolvePagination } from '../../core/utils/pagination';
import { normalizeString } from '../../core/utils/strings';
import { CreateProgramAttachmentDto } from './dto/create-program-attachment.dto';
import { CreateProgramCommentDto } from './dto/create-program-comment.dto';
import { CreateProgramDto } from './dto/create-program.dto';
import { ListProgramsQueryDto } from './dto/list-programs-query.dto';
import { UpdateProgramDto } from './dto/update-program.dto';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;
const PROGRAM_TYPE_SEARCH_MAP: Array<{ value: ProgramType; tokens: string[] }> = [
  { value: 'SCFV', tokens: ['scfv'] },
  { value: 'PAIF', tokens: ['paif'] },
  { value: 'PAEFI', tokens: ['paefi'] },
  { value: 'CULTURAL', tokens: ['cultural', 'cultura'] },
  { value: 'QUALIFICATION', tokens: ['qualification', 'qualificacao', 'qualificação'] },
  { value: 'OTHER', tokens: ['other', 'outro'] },
];
const PROGRAM_STATUS_SEARCH_MAP: Array<{ value: ProgramStatus; tokens: string[] }> = [
  { value: 'PLANNED', tokens: ['planned', 'planejado'] },
  { value: 'ACTIVE', tokens: ['active', 'ativo'] },
  { value: 'CLOSED', tokens: ['closed', 'encerrado'] },
];

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

const mapProgramCommentItem = (
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

const mapProgramAttachmentItem = (
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

function serializeProgram(program: {
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
    ...program,
    tags: parseTags(program.tags),
    comments: program.comments?.map(mapProgramCommentItem) ?? [],
    attachments: program.attachments?.map(mapProgramAttachmentItem) ?? [],
  };
}

function resolveRangeDates(params: { from?: string; to?: string }) {
  const from = parseDateInput(params.from);
  const to = parseDateInput(params.to);
  if (from && to && from > to) {
    throw new BadRequestException('Intervalo de datas inválido');
  }
  return { from, to };
}

function ensureValidPeriod(params: { startsAt?: Date | null; endsAt?: Date | null }) {
  const startsAt = params.startsAt ?? null;
  const endsAt = params.endsAt ?? null;
  if (startsAt && endsAt && startsAt > endsAt) {
    throw new BadRequestException('Período inválido: início maior que término');
  }
}

function resolveMatchingProgramTypes(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return PROGRAM_TYPE_SEARCH_MAP.filter((entry) =>
    entry.tokens.some((token) => token.includes(normalized) || normalized.includes(token)),
  ).map((entry) => entry.value);
}

function resolveMatchingProgramStatuses(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return PROGRAM_STATUS_SEARCH_MAP.filter((entry) =>
    entry.tokens.some((token) => token.includes(normalized) || normalized.includes(token)),
  ).map((entry) => entry.value);
}

@Injectable()
export class ProgramsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPrograms(tenantId: string, query: ListProgramsQueryDto) {
    const { page, limit, skip, take, isAll } = resolvePagination({
      page: query.page,
      limit: query.limit,
      all: query.all,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    });

    const q = normalizeString(query.q);
    const matchingTypes = q ? resolveMatchingProgramTypes(q) : [];
    const matchingStatuses = q ? resolveMatchingProgramStatuses(q) : [];
    const { from, to } = resolveRangeDates({ from: query.from, to: query.to });

    const where: Prisma.ProgramWhereInput = {
      tenantId,
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { description: { contains: q } },
              { tags: { contains: q } },
              { internalNotes: { contains: q } },
              ...matchingTypes.map((type) => ({ type })),
              ...matchingStatuses.map((status) => ({ status })),
            ],
          }
        : {}),
      ...(query.type ? { type: query.type as ProgramType } : {}),
      ...(query.status ? { status: query.status as ProgramStatus } : {}),
      ...(from ? { startsAt: { gte: from } } : {}),
      ...(to ? { endsAt: { lte: to } } : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.program.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...(isAll ? {} : { skip, take }),
      }),
      this.prisma.program.count({ where }),
    ]);

    return {
      data: data.map((program) => serializeProgram(program)),
      pagination: buildPaginationMeta({ page, limit, total, isAll }),
    };
  }

  async getProgram(tenantId: string, id: string) {
    return this.findById(tenantId, id);
  }

  private async findById(tenantId: string, id: string) {
    const program = await this.prisma.program.findFirst({
      where: { id, tenantId },
      include: {
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
    if (!program) throw new NotFoundException('Programa não encontrado');
    return serializeProgram(program);
  }

  private async findProgramEntity(tenantId: string, id: string) {
    const program = await this.prisma.program.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!program) throw new NotFoundException('Programa não encontrado');
    return program;
  }

  async createProgram(tenantId: string, dto: CreateProgramDto) {
    const name = (dto.name ?? '').trim();
    if (!name) throw new BadRequestException('Nome é obrigatório');

    const startsAt = parseDateInput(dto.startsAt);
    const endsAt = parseDateInput(dto.endsAt);
    ensureValidPeriod({ startsAt, endsAt });

    const created = await this.prisma.program.create({
      data: {
        tenantId,
        name,
        type: dto.type,
        description: dto.description?.trim() ? dto.description.trim() : null,
        tags: normalizeTags(dto.tags),
        internalNotes: dto.internalNotes?.trim() ? dto.internalNotes.trim() : null,
        status: dto.status ?? 'PLANNED',
        startsAt,
        endsAt,
      },
    });

    return this.findById(tenantId, created.id);
  }

  async updateProgram(tenantId: string, id: string, dto: UpdateProgramDto) {
    const existing = await this.prisma.program.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Programa não encontrado');

    const name = dto.name !== undefined ? (dto.name ?? '').trim() : undefined;
    if (name !== undefined && !name) {
      throw new BadRequestException('Nome é obrigatório');
    }

    const startsAt =
      dto.startsAt !== undefined ? parseDateInput(dto.startsAt) : existing.startsAt;
    const endsAt = dto.endsAt !== undefined ? parseDateInput(dto.endsAt) : existing.endsAt;
    ensureValidPeriod({ startsAt, endsAt });

    const updated = await this.prisma.program.update({
      where: { id: existing.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() ? dto.description.trim() : null }
          : {}),
        ...(dto.tags !== undefined ? { tags: normalizeTags(dto.tags) } : {}),
        ...(dto.internalNotes !== undefined
          ? { internalNotes: dto.internalNotes?.trim() ? dto.internalNotes.trim() : null }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.startsAt !== undefined ? { startsAt } : {}),
        ...(dto.endsAt !== undefined ? { endsAt } : {}),
      },
    });

    return this.findById(tenantId, updated.id);
  }

  async deleteProgram(tenantId: string, id: string) {
    const existing = await this.prisma.program.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Programa não encontrado');

    const projectsCount = await this.prisma.project.count({
      where: { tenantId, programId: existing.id },
    });
    if (projectsCount > 0) {
      throw new BadRequestException(
        'Não é possível excluir o programa: existem projetos vinculados',
      );
    }

    await this.prisma.program.delete({ where: { id: existing.id } });
    return { ok: true as const };
  }

  async addComment(
    tenantId: string,
    actorUserId: string,
    programId: string,
    dto: CreateProgramCommentDto,
  ) {
    await this.findProgramEntity(tenantId, programId);
    const body = dto.body.trim();
    if (!body) {
      throw new BadRequestException('Informe um comentario.');
    }

    const mentionUserIds = await this.resolveMentionUserIds(tenantId, dto.mentionUserIds);

    await this.prisma.programComment.create({
      data: {
        tenantId,
        programId,
        authorUserId: actorUserId,
        body,
        mentionUserIds,
      },
    });

    return this.findById(tenantId, programId);
  }

  async deleteComment(tenantId: string, programId: string, commentId: string) {
    await this.findProgramEntity(tenantId, programId);
    const comment = await this.prisma.programComment.findFirst({
      where: { id: commentId, tenantId, programId },
      select: { id: true },
    });
    if (!comment) {
      throw new NotFoundException('Comentario nao encontrado');
    }

    await this.prisma.programComment.delete({ where: { id: comment.id } });
    return this.findById(tenantId, programId);
  }

  async addAttachment(
    tenantId: string,
    actorUserId: string,
    programId: string,
    dto: CreateProgramAttachmentDto,
  ) {
    await this.findProgramEntity(tenantId, programId);
    const label = dto.label.trim();
    const filePath = dto.filePath.trim();

    if (!label) {
      throw new BadRequestException('Informe um nome para o anexo.');
    }

    if (!filePath.startsWith('/uploads/programs/')) {
      throw new BadRequestException('Caminho de anexo invalido.');
    }

    await this.prisma.programAttachment.create({
      data: {
        tenantId,
        programId,
        uploadedByUserId: actorUserId,
        label,
        filePath,
        mimeType: normalizeString(dto.mimeType),
        fileSizeBytes: dto.fileSizeBytes ?? null,
      },
    });

    return this.findById(tenantId, programId);
  }

  async deleteAttachment(tenantId: string, programId: string, attachmentId: string) {
    await this.findProgramEntity(tenantId, programId);
    const attachment = await this.prisma.programAttachment.findFirst({
      where: { id: attachmentId, tenantId, programId },
      select: { id: true },
    });
    if (!attachment) {
      throw new NotFoundException('Anexo nao encontrado');
    }

    await this.prisma.programAttachment.delete({ where: { id: attachment.id } });
    return this.findById(tenantId, programId);
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
