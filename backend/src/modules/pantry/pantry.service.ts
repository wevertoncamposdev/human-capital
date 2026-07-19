import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma';
import { PrismaService } from '../../core/prisma/prisma.service';
import { parseDateInput } from '../../core/utils/dates';
import { buildPaginationMeta, resolvePagination } from '../../core/utils/pagination';
import { normalizeString } from '../../core/utils/strings';
import { CreatePantryDonorDto } from './dto/create-pantry-donor.dto';
import { CreatePantryDonorAttachmentDto } from './dto/create-pantry-donor-attachment.dto';
import { CreatePantryDonorCommentDto } from './dto/create-pantry-donor-comment.dto';
import { CreatePantryEntryDto } from './dto/create-pantry-entry.dto';
import { CreatePantryEntryAttachmentDto } from './dto/create-pantry-entry-attachment.dto';
import { CreatePantryEntryCommentDto } from './dto/create-pantry-entry-comment.dto';
import { CreatePantryExitDto } from './dto/create-pantry-exit.dto';
import { CreatePantryExitAttachmentDto } from './dto/create-pantry-exit-attachment.dto';
import { CreatePantryExitCommentDto } from './dto/create-pantry-exit-comment.dto';
import { CreatePantryItemDto } from './dto/create-pantry-item.dto';
import { CreatePantryItemAttachmentDto } from './dto/create-pantry-item-attachment.dto';
import { CreatePantryItemCommentDto } from './dto/create-pantry-item-comment.dto';
import { ListPantryItemsQueryDto } from './dto/list-pantry-items-query.dto';
import { UpdatePantryDonorDto } from './dto/update-pantry-donor.dto';
import { UpdatePantryEntryDto } from './dto/update-pantry-entry.dto';
import { UpdatePantryExitDto } from './dto/update-pantry-exit.dto';
import { UpdatePantryItemDto } from './dto/update-pantry-item.dto';
import { ReversePantryMovementDto } from './dto/reverse-pantry-movement.dto';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;
const DEFAULT_HISTORY_LIMIT = 50;
const MAX_HISTORY_LIMIT = 500;

const toNumber = (value?: Prisma.Decimal | number | null) =>
  value === null || value === undefined ? 0 : Number(value);

const normalizeSector = (sector?: string | null) => {
  const normalized = typeof sector === 'string' ? sector.trim() : '';
  return normalized.length ? normalized : 'Geral';
};

const resolveValidityStatus = (expiry?: Date | null) => {
  if (!expiry) return 'Sem validade';
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'Vencido';
  if (diffDays <= 30) return 'Urgente';
  if (diffDays <= 60) return 'Alerta';
  if (diffDays <= 90) return 'Atencao';
  return 'Normal';
};

const resolveDaysToExpire = (expiry?: Date | null) => {
  if (!expiry) return null;
  const now = new Date();
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

const resolveMonthKey = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
};

const resolveMonthLabel = (date: Date) =>
  new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: '2-digit',
  }).format(date);

const resolveExitTypeLabel = (type: string) => {
  switch (type) {
    case 'ATTENDED':
      return 'Atendidos';
    case 'DONATION':
      return 'Doações';
    case 'EVENT':
      return 'Eventos';
    case 'PARTY':
      return 'Festas';
    case 'CORRECTION':
      return 'Correção';
    default:
      return type;
  }
};

const normalizeTags = (tags?: string[] | null) => {
  const normalized = Array.from(
    new Set((tags ?? []).map((entry) => normalizeString(entry)).filter(Boolean)),
  );
  return normalized.length ? normalized : [];
};

const parseTags = (value?: string | null) => {
  if (!value) return [];

  return Array.from(
    new Set(
      value
        .split('\n')
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
};

const serializeTags = (tags?: string[] | null) => {
  const normalized = normalizeTags(tags);
  return normalized.length ? normalized.join('\n') : null;
};

const parseMentionUserIds = (value: Prisma.JsonValue | null | undefined) =>
  Array.isArray(value)
    ? Array.from(
        new Set(
          value
            .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
            .filter(Boolean),
        ),
      )
    : [];

const formatBytes = (value?: number | null) => {
  if (!value || value <= 0) return null;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

@Injectable()
export class PantryService {
  constructor(private readonly prisma: PrismaService) {}

  private serializeCommentAuthor(
    authorUser?: { id: string; name: string | null; email: string | null; avatarUrl: string | null } | null,
  ) {
    return {
      id: authorUser?.id ?? null,
      name: authorUser?.name || authorUser?.email || 'Usuário',
      email: authorUser?.email ?? null,
      avatarUrl: authorUser?.avatarUrl ?? null,
    };
  }

  private serializeAttachment(
    attachment?: {
      id: string;
      label: string;
      filePath: string;
      mimeType: string | null;
      fileSizeBytes: number | null;
      createdAt: Date;
    } | null,
  ) {
    if (!attachment) return null;

    return {
      id: attachment.id,
      label: attachment.label,
      filePath: attachment.filePath,
      mimeType: attachment.mimeType,
      fileSizeBytes: attachment.fileSizeBytes,
      sizeLabel: formatBytes(attachment.fileSizeBytes),
      createdAt: attachment.createdAt,
    };
  }

  private serializeItem(
    item: {
      id: string;
      tenantId: string;
      name: string;
      group: string | null;
      defaultSector: string;
      unit: string;
      minStock: Prisma.Decimal | number;
      notes: string | null;
      tags?: string | null;
      internalNotes?: string | null;
      createdAt: Date;
      updatedAt: Date;
      comments?: Array<{
        id: string;
        body: string;
        mentionUserIds: Prisma.JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        authorUser?: { id: string; name: string | null; email: string | null; avatarUrl: string | null } | null;
      }>;
      attachments?: Array<{
        id: string;
        label: string;
        filePath: string;
        mimeType: string | null;
        fileSizeBytes: number | null;
        createdAt: Date;
      }>;
    } & Record<string, unknown>,
    extra?: Partial<Record<string, unknown>>,
  ) {
    return {
      id: item.id,
      tenantId: item.tenantId,
      name: item.name,
      group: item.group,
      defaultSector: normalizeSector(item.defaultSector),
      unit: item.unit,
      minStock: toNumber(item.minStock),
      notes: item.notes ?? null,
      tags: parseTags(item.tags),
      internalNotes: item.internalNotes ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      comments:
        item.comments?.map((comment) => ({
          id: comment.id,
          body: comment.body,
          mentionUserIds: parseMentionUserIds(comment.mentionUserIds),
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          author: this.serializeCommentAuthor(comment.authorUser),
        })) ?? [],
      attachments:
        item.attachments?.map((attachment) => this.serializeAttachment(attachment)).filter(Boolean) ??
        [],
      ...(extra ?? {}),
    };
  }

  private serializeDonor(donor: {
    id: string;
    name: string;
    type: string;
    contact: string | null;
    avatarUrl: string | null;
    tags?: string | null;
    internalNotes?: string | null;
    createdAt: Date;
    updatedAt: Date;
    comments?: Array<{
      id: string;
      body: string;
      mentionUserIds: Prisma.JsonValue | null;
      createdAt: Date;
      updatedAt: Date;
      authorUser?: { id: string; name: string | null; email: string | null; avatarUrl: string | null } | null;
    }>;
    attachments?: Array<{
      id: string;
      label: string;
      filePath: string;
      mimeType: string | null;
      fileSizeBytes: number | null;
      createdAt: Date;
    }>;
  }) {
    return {
      id: donor.id,
      name: donor.name,
      type: donor.type,
      contact: donor.contact,
      avatarUrl: donor.avatarUrl,
      tags: parseTags(donor.tags),
      internalNotes: donor.internalNotes ?? null,
      createdAt: donor.createdAt,
      updatedAt: donor.updatedAt,
      comments:
        donor.comments?.map((comment) => ({
          id: comment.id,
          body: comment.body,
          mentionUserIds: parseMentionUserIds(comment.mentionUserIds),
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          author: this.serializeCommentAuthor(comment.authorUser),
        })) ?? [],
      attachments:
        donor.attachments?.map((attachment) => this.serializeAttachment(attachment)).filter(Boolean) ??
        [],
    };
  }

  private async resolveMentionUserIds(tenantId: string, mentionUserIds?: string[] | null) {
    const normalized = Array.from(
      new Set((mentionUserIds ?? []).map((entry) => entry.trim()).filter(Boolean)),
    );

    if (!normalized.length) return [];

    const users = await this.prisma.user.findMany({
      where: { tenantId, id: { in: normalized } },
      select: { id: true },
    });

    return users.map((user) => user.id);
  }

  private serializeEntry(
    entry: {
      id: string;
      itemId: string;
      donorId: string | null;
      sector: string;
      quantity: Prisma.Decimal | number;
      unit: string;
      entryDate: Date;
      expiryDate: Date | null;
      notes: string | null;
      tags?: string | null;
      internalNotes?: string | null;
      createdAt: Date;
      updatedAt: Date;
      item: { id: string; name: string; unit: string; group?: string | null };
      donor: { id: string; name: string; type: string; contact: string | null } | null;
      comments?: Array<{
        id: string;
        body: string;
        mentionUserIds: Prisma.JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        authorUser?: { id: string; name: string | null; email: string | null; avatarUrl: string | null } | null;
      }>;
      attachments?: Array<{
        id: string;
        label: string;
        filePath: string;
        mimeType: string | null;
        fileSizeBytes: number | null;
        createdAt: Date;
      }>;
    },
    extras?: Partial<Record<string, unknown>>,
  ) {
    return {
      id: entry.id,
      itemId: entry.itemId,
      donorId: entry.donorId,
      sector: normalizeSector(entry.sector),
      quantity: toNumber(entry.quantity),
      unit: entry.unit,
      entryDate: entry.entryDate,
      expiryDate: entry.expiryDate,
      notes: entry.notes,
      tags: parseTags(entry.tags),
      internalNotes: entry.internalNotes ?? null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      item: entry.item,
      donor: entry.donor,
      comments:
        entry.comments?.map((comment) => ({
          id: comment.id,
          body: comment.body,
          mentionUserIds: parseMentionUserIds(comment.mentionUserIds),
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          author: this.serializeCommentAuthor(comment.authorUser),
        })) ?? [],
      attachments:
        entry.attachments?.map((attachment) => this.serializeAttachment(attachment)).filter(Boolean) ??
        [],
      ...(extras ?? {}),
    };
  }

  private serializeExit(
    exit: {
      id: string;
      itemId: string;
      sector: string;
      quantity: Prisma.Decimal | number;
      unit: string;
      exitDate: Date;
      type: string;
      eventName: string | null;
      notes: string | null;
      tags?: string | null;
      internalNotes?: string | null;
      createdAt: Date;
      updatedAt: Date;
      item: { id: string; name: string; unit: string; group?: string | null };
      allocations?: Array<{
        entryId: string;
        quantity: Prisma.Decimal | number;
        entry: { expiryDate: Date | null; sector: string; entryDate?: Date | null };
      }>;
      comments?: Array<{
        id: string;
        body: string;
        mentionUserIds: Prisma.JsonValue | null;
        createdAt: Date;
        updatedAt: Date;
        authorUser?: { id: string; name: string | null; email: string | null; avatarUrl: string | null } | null;
      }>;
      attachments?: Array<{
        id: string;
        label: string;
        filePath: string;
        mimeType: string | null;
        fileSizeBytes: number | null;
        createdAt: Date;
      }>;
    },
    extras?: Partial<Record<string, unknown>>,
  ) {
    return {
      id: exit.id,
      itemId: exit.itemId,
      entryIds: exit.allocations?.map((allocation) => allocation.entryId) ?? [],
      allocations:
        exit.allocations?.map((allocation) => ({
          entryId: allocation.entryId,
          quantity: toNumber(allocation.quantity),
          expiryDate: allocation.entry.expiryDate,
          sector: normalizeSector(allocation.entry.sector),
          ...(allocation.entry.entryDate ? { entryDate: allocation.entry.entryDate } : {}),
        })) ?? [],
      sector: normalizeSector(exit.sector),
      quantity: toNumber(exit.quantity),
      unit: exit.unit,
      exitDate: exit.exitDate,
      type: exit.type,
      eventName: exit.eventName,
      notes: exit.notes,
      tags: parseTags(exit.tags),
      internalNotes: exit.internalNotes ?? null,
      createdAt: exit.createdAt,
      updatedAt: exit.updatedAt,
      item: exit.item,
      comments:
        exit.comments?.map((comment) => ({
          id: comment.id,
          body: comment.body,
          mentionUserIds: parseMentionUserIds(comment.mentionUserIds),
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          author: this.serializeCommentAuthor(comment.authorUser),
        })) ?? [],
      attachments:
        exit.attachments?.map((attachment) => this.serializeAttachment(attachment)).filter(Boolean) ??
        [],
      ...(extras ?? {}),
    };
  }

  async listHistory(
    tenantId: string,
    params?: {
      page?: number;
      limit?: number;
      all?: boolean;
      kind?: 'ALL' | 'ENTRY' | 'EXIT';
      search?: string;
      itemId?: string;
      type?: string;
      eventName?: string;
      from?: string;
      to?: string;
    },
  ) {
    const { page, limit, skip, take, isAll } = resolvePagination({
      page: params?.page,
      limit: params?.limit,
      all: params?.all,
      defaultLimit: DEFAULT_HISTORY_LIMIT,
      maxLimit: MAX_HISTORY_LIMIT,
    });

    const kind = params?.kind ?? 'ALL';
    const search = normalizeString(params?.search);
    const eventName = normalizeString(params?.eventName);
    const fromDate = parseDateInput(params?.from);
    const toDate = parseDateInput(params?.to, { endOfDay: true });

    const entryWhere: Prisma.Sql[] = [Prisma.sql`e.tenantId = ${tenantId}`];
    const exitWhere: Prisma.Sql[] = [Prisma.sql`x.tenantId = ${tenantId}`];

    if (params?.itemId) {
      entryWhere.push(Prisma.sql`e.itemId = ${params.itemId}`);
      exitWhere.push(Prisma.sql`x.itemId = ${params.itemId}`);
    }

    if (fromDate) {
      entryWhere.push(Prisma.sql`e.entryDate >= ${fromDate}`);
      exitWhere.push(Prisma.sql`x.exitDate >= ${fromDate}`);
    }

    if (toDate) {
      entryWhere.push(Prisma.sql`e.entryDate <= ${toDate}`);
      exitWhere.push(Prisma.sql`x.exitDate <= ${toDate}`);
    }

    if (search) {
      const like = `%${search}%`;
      entryWhere.push(
        Prisma.sql`(i.name LIKE ${like} OR d.name LIKE ${like})`,
      );
      exitWhere.push(Prisma.sql`i.name LIKE ${like}`);
    }

    if (params?.type) {
      exitWhere.push(Prisma.sql`x.type = ${params.type}`);
    }

    if (eventName) {
      const like = `%${eventName}%`;
      exitWhere.push(Prisma.sql`x.eventName LIKE ${like}`);
    }

    const entrySelect = Prisma.sql`
      SELECT
        'ENTRY' AS kind,
        e.id AS movementId,
        e.entryDate AS movementDate,
        e.createdAt AS createdAt,
        e.itemId AS itemId,
        i.name AS itemName,
        i.\`group\` AS itemGroup,
        e.sector AS sector,
        e.quantity AS quantity,
        e.unit AS unit,
        e.notes AS notes,
        e.expiryDate AS expiryDate,
        d.name AS donorName,
        NULL AS exitType,
        NULL AS eventName
      FROM \`PantryEntry\` e
      JOIN \`PantryItem\` i ON i.id = e.itemId
      LEFT JOIN \`PantryDonor\` d ON d.id = e.donorId
      WHERE ${Prisma.join(entryWhere, ' AND ')}
    `;

    const exitSelect = Prisma.sql`
      SELECT
        'EXIT' AS kind,
        x.id AS movementId,
        x.exitDate AS movementDate,
        x.createdAt AS createdAt,
        x.itemId AS itemId,
        i.name AS itemName,
        i.\`group\` AS itemGroup,
        x.sector AS sector,
        x.quantity AS quantity,
        x.unit AS unit,
        x.notes AS notes,
        NULL AS expiryDate,
        NULL AS donorName,
        x.type AS exitType,
        x.eventName AS eventName
      FROM \`PantryExit\` x
      JOIN \`PantryItem\` i ON i.id = x.itemId
      WHERE ${Prisma.join(exitWhere, ' AND ')}
    `;

    const unions: Prisma.Sql[] = [];
    if (kind === 'ALL' || kind === 'ENTRY') unions.push(entrySelect);
    if (kind === 'ALL' || kind === 'EXIT') unions.push(exitSelect);

    const unionSql = unions.length === 1 ? unions[0] : Prisma.join(unions, ' UNION ALL ');

    type CountRow = { total: bigint | number };

    const countRows = await this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT COUNT(*) AS total
      FROM (${unionSql}) u
    `);

    const totalRaw = countRows[0]?.total ?? 0;
    const total = typeof totalRaw === 'bigint' ? Number(totalRaw) : Number(totalRaw);

    type HistoryRow = {
      kind: 'ENTRY' | 'EXIT';
      movementId: string;
      movementDate: Date;
      createdAt: Date;
      itemId: string;
      itemName: string;
      itemGroup: string | null;
      sector: string | null;
      quantity: unknown;
      unit: string;
      notes: string | null;
      expiryDate: Date | null;
      donorName: string | null;
      exitType: string | null;
      eventName: string | null;
    };

    const paginationSql = isAll
      ? Prisma.sql``
      : Prisma.sql`LIMIT ${take} OFFSET ${skip}`;

    const rows = await this.prisma.$queryRaw<HistoryRow[]>(Prisma.sql`
      SELECT *
      FROM (${unionSql}) u
      ORDER BY u.movementDate DESC, u.createdAt DESC, u.kind DESC, u.movementId DESC
      ${paginationSql}
    `);

    const entryIds = rows
      .filter((row) => row.kind === 'ENTRY')
      .map((row) => row.movementId);
    const exitIds = rows
      .filter((row) => row.kind === 'EXIT')
      .map((row) => row.movementId);

    const [createdByMap, removedByMap] = await Promise.all([
      this.resolveAuditUserLabels(tenantId, 'PantryEntry', entryIds),
      this.resolveAuditUserLabels(tenantId, 'PantryExit', exitIds),
    ]);

    return {
      data: rows.map((row) => {
        const actor =
          row.kind === 'ENTRY'
            ? createdByMap.get(row.movementId) ?? 'Sistema'
            : removedByMap.get(row.movementId) ?? 'Sistema';

        return {
          id: row.movementId,
          kind: row.kind,
          movementDate: row.movementDate,
          createdAt: row.createdAt,
          itemId: row.itemId,
          item: {
            id: row.itemId,
            name: row.itemName,
            unit: row.unit,
            group: row.itemGroup,
          },
          sector: normalizeSector(row.sector),
          quantity: Number(row.quantity),
          unit: row.unit,
          notes: row.notes,
          expiryDate: row.expiryDate,
          donorName: row.donorName,
          type: row.exitType,
          eventName: row.eventName,
          actor,
        };
      }),
      pagination: buildPaginationMeta({
        page,
        limit,
        total,
        isAll,
      }),
    };
  }

  private async syncSectorsFromData(tenantId: string) {
    const [entrySectors, exitSectors, items] = await this.prisma.$transaction([
      this.prisma.pantryEntry.groupBy({
        by: ['sector'],
        where: { tenantId },
        orderBy: { sector: 'asc' },
      }),
      this.prisma.pantryExit.groupBy({
        by: ['sector'],
        where: { tenantId },
        orderBy: { sector: 'asc' },
      }),
      this.prisma.pantryItem.findMany({
        where: { tenantId },
        select: { defaultSector: true },
      }),
    ]);

    const set = new Set<string>();
    set.add('Geral');

    entrySectors.forEach((row) => set.add(normalizeSector(row.sector)));
    exitSectors.forEach((row) => set.add(normalizeSector(row.sector)));
    items.forEach((row) => set.add(normalizeSector(row.defaultSector)));

    const names = Array.from(set).filter(Boolean);
    if (!names.length) return;

    await this.prisma.pantrySector.createMany({
      data: names.map((name) => ({ tenantId, name })),
      skipDuplicates: true,
    });
  }

  private async ensureSector(
    tenantId: string,
    sector: string,
    params?: { client?: Prisma.TransactionClient },
  ) {
    const client = params?.client ?? this.prisma;
    const name = normalizeSector(sector);
    await client.pantrySector.upsert({
      where: { tenantId_name: { tenantId, name } },
      create: { tenantId, name },
      update: {},
    });
    return name;
  }

  async listSectors(tenantId: string) {
    await this.syncSectorsFromData(tenantId);

    const sectors = await this.prisma.pantrySector.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });

    return {
      data: sectors.map((sector) => ({ id: sector.id, name: sector.name })),
    };
  }

  async createSector(tenantId: string, dto: { name: string }) {
    const name = normalizeSector(dto.name);
    const sector = await this.prisma.pantrySector.upsert({
      where: { tenantId_name: { tenantId, name } },
      create: { tenantId, name },
      update: {},
    });

    return { id: sector.id, name: sector.name };
  }

  private async sumExitAllocationsByEntry(
    tenantId: string,
    entryIds: string[],
    params?: { excludeExitId?: string; client?: Prisma.TransactionClient },
  ) {
    if (!entryIds.length) return new Map<string, number>();

    const client = params?.client ?? this.prisma;

    const groups = await client.pantryExitAllocation.groupBy({
      by: ['entryId'],
      where: {
        tenantId,
        entryId: { in: entryIds },
        ...(params?.excludeExitId
          ? { exitId: { not: params.excludeExitId } }
          : {}),
      },
      _sum: { quantity: true },
    });

    return new Map(
      groups.map((group) => [group.entryId, toNumber(group._sum?.quantity)]),
    );
  }

  private resolveOpenEntryExpiryMaps(
    entries: Array<{
      id: string;
      itemId: string;
      sector: string;
      expiryDate: Date | null;
      quantity: Prisma.Decimal | number;
    }>,
    allocationMap: Map<string, number>,
  ) {
    const byItem = new Map<string, { date: Date; entryId: string }>();
    const bySector = new Map<string, { date: Date; entryId: string }>();

    entries.forEach((entry) => {
      if (!entry.expiryDate) return;
      const remaining =
        toNumber(entry.quantity) - (allocationMap.get(entry.id) ?? 0);
      if (remaining <= 0) return;

      const expiry = entry.expiryDate;
      const itemKey = entry.itemId;
      const sectorKey = `${entry.itemId}::${normalizeSector(entry.sector)}`;

      const currentItem = byItem.get(itemKey);
      if (!currentItem || expiry < currentItem.date) {
        byItem.set(itemKey, { date: expiry, entryId: entry.id });
      }

      const currentSector = bySector.get(sectorKey);
      if (!currentSector || expiry < currentSector.date) {
        bySector.set(sectorKey, { date: expiry, entryId: entry.id });
      }
    });

    return { byItem, bySector };
  }

  private async resolveAuditUserLabels(
    tenantId: string,
    entity: string,
    entityIds: string[],
  ) {
    if (!entityIds.length) return new Map<string, string>();

    const logs = await this.prisma.auditLog.findMany({
      where: {
        tenantId,
        entity,
        action: 'CREATE',
        entityId: { in: entityIds },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const map = new Map<string, string>();
    logs.forEach((log) => {
      if (!log.entityId) return;
      if (map.has(log.entityId)) return;
      const userLabel =
        log.user?.name || log.user?.email || log.userId || 'Sistema';
      map.set(log.entityId, userLabel);
    });
    return map;
  }

  async listItems(tenantId: string, query: ListPantryItemsQueryDto) {
    const { page, limit, skip, take, isAll } = resolvePagination({
      page: query.page,
      limit: query.limit,
      all: query.all,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    });

    const search = normalizeString(query.q);
    const where: Prisma.PantryItemWhereInput = {
      tenantId,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { group: { contains: search } },
              { tags: { contains: search } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.pantryItem.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: isAll ? undefined : skip,
        take: isAll ? undefined : take,
      }),
      this.prisma.pantryItem.count({ where }),
    ]);

    const data = await this.enrichItems(tenantId, items);

    return {
      data,
      pagination: buildPaginationMeta({
        page,
        limit,
        total,
        isAll,
      }),
    };
  }

  async listItemSuggestions(tenantId: string) {
    const [unitsRows, groupRows] = await this.prisma.$transaction([
      this.prisma.pantryItem.findMany({
        where: { tenantId },
        select: { unit: true },
        distinct: ['unit'],
      }),
      this.prisma.pantryItem.findMany({
        where: { tenantId, group: { not: null } },
        select: { group: true },
        distinct: ['group'],
      }),
    ]);

    const units = Array.from(
      new Set(
        unitsRows
          .map((row) => normalizeString(row.unit))
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort((a, b) => a.localeCompare(b));

    const groups = Array.from(
      new Set(
        groupRows
          .map((row) => normalizeString(row.group))
          .filter((value): value is string => Boolean(value)),
      ),
    ).sort((a, b) => a.localeCompare(b));

    return { units, groups };
  }

  async getEntry(tenantId: string, id: string) {
    const entry = await this.prisma.pantryEntry.findFirst({
      where: { id, tenantId },
      include: {
        item: { select: { id: true, name: true, unit: true, group: true } },
        donor: { select: { id: true, name: true, type: true, contact: true } },
        comments: {
          orderBy: { createdAt: 'desc' },
          include: {
            authorUser: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
        },
        attachments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!entry) {
      throw new NotFoundException('Entrada nao encontrada');
    }

    const allocatedMap = await this.sumExitAllocationsByEntry(tenantId, [id]);
    const allocatedTotal = allocatedMap.get(id) ?? 0;
    const remaining = toNumber(entry.quantity) - allocatedTotal;

    const createdByMap = await this.resolveAuditUserLabels(tenantId, 'PantryEntry', [id]);

    return this.serializeEntry(entry, {
      allocatedTotal,
      remaining,
      isClosed: remaining <= 0,
      createdBy: createdByMap.get(entry.id) ?? 'Sistema',
    });
  }

  async getItem(tenantId: string, id: string) {
    const item = await this.prisma.pantryItem.findFirst({
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
        attachments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!item) {
      throw new NotFoundException('Item nao encontrado');
    }

    const [enriched] = await this.enrichItems(tenantId, [item]);
    return this.serializeItem(item, enriched ?? {});
  }

  async listItemAuditLogs(
    tenantId: string,
    itemId: string,
    params?: { page?: number; limit?: number },
  ) {
    await this.getItem(tenantId, itemId);

    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit =
      params?.limit && params.limit > 0 ? Math.min(params.limit, 200) : 50;
    const skip = (page - 1) * limit;

    const [entryRows, exitRows] = await this.prisma.$transaction([
      this.prisma.pantryEntry.findMany({
        where: { tenantId, itemId },
        select: { id: true },
      }),
      this.prisma.pantryExit.findMany({
        where: { tenantId, itemId },
        select: { id: true },
      }),
    ]);

    const entryIds = entryRows.map((entry) => entry.id);
    const exitIds = exitRows.map((exit) => exit.id);

    const where: Prisma.AuditLogWhereInput = {
      tenantId,
      OR: [
        {
          entity: 'PantryItem',
          entityId: itemId,
        },
        ...(entryIds.length
          ? [
              {
                entity: 'PantryEntry',
                entityId: { in: entryIds },
              } satisfies Prisma.AuditLogWhereInput,
            ]
          : []),
        ...(exitIds.length
          ? [
              {
                entity: 'PantryExit',
                entityId: { in: exitIds },
              } satisfies Prisma.AuditLogWhereInput,
            ]
          : []),
      ],
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async createItem(tenantId: string, dto: CreatePantryItemDto) {
    const defaultSector = await this.ensureSector(tenantId, dto.defaultSector ?? 'Geral');
    const item = await this.prisma.pantryItem.create({
      data: {
        tenantId,
        name: dto.name,
        group: dto.group ?? null,
        defaultSector,
        unit: dto.unit,
        minStock: dto.minStock,
        notes: normalizeString(dto.notes),
        tags: serializeTags(dto.tags),
        internalNotes: normalizeString(dto.internalNotes),
      },
      include: {
        comments: {
          orderBy: { createdAt: 'desc' },
          include: { authorUser: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        attachments: { orderBy: { createdAt: 'desc' } },
      },
    });

    const [enriched] = await this.enrichItems(tenantId, [item]);
    return this.serializeItem(item, enriched ?? {});
  }

  async updateItem(tenantId: string, id: string, dto: UpdatePantryItemDto) {
    await this.getItem(tenantId, id);

    const defaultSector =
      dto.defaultSector !== undefined
        ? await this.ensureSector(tenantId, dto.defaultSector)
        : undefined;

    const item = await this.prisma.pantryItem.update({
      where: { id },
      data: {
        name: dto.name,
        group: dto.group ?? undefined,
        defaultSector,
        unit: dto.unit,
        minStock: dto.minStock,
        notes: dto.notes !== undefined ? normalizeString(dto.notes) : undefined,
        tags: dto.tags !== undefined ? serializeTags(dto.tags) : undefined,
        internalNotes:
          dto.internalNotes !== undefined ? normalizeString(dto.internalNotes) : undefined,
      },
      include: {
        comments: {
          orderBy: { createdAt: 'desc' },
          include: { authorUser: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        attachments: { orderBy: { createdAt: 'desc' } },
      },
    });

    const [enriched] = await this.enrichItems(tenantId, [item]);
    return this.serializeItem(item, enriched ?? {});
  }

  async deleteItem(tenantId: string, id: string) {
    await this.getItem(tenantId, id);
    await this.prisma.$transaction([
      this.prisma.pantryItemComment.deleteMany({ where: { tenantId, itemId: id } }),
      this.prisma.pantryItemAttachment.deleteMany({ where: { tenantId, itemId: id } }),
      this.prisma.pantryItem.delete({ where: { id } }),
    ]);
    return { ok: true };
  }

  async listDonors(
    tenantId: string,
    params?: { page?: number; limit?: number; all?: boolean; search?: string },
  ) {
    const isAll = params?.all === true;
    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit =
      params?.limit && params.limit > 0 ? Math.min(params.limit, 200) : 20;
    const skip = (page - 1) * limit;
    const search = normalizeString(params?.search);

    const where: Prisma.PantryDonorWhereInput = {
      tenantId,
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { contact: { contains: search } },
              { tags: { contains: search } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.pantryDonor.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: isAll ? undefined : skip,
        take: isAll ? undefined : limit,
        include: {
          comments: {
            orderBy: { createdAt: 'desc' },
            include: { authorUser: { select: { id: true, name: true, email: true, avatarUrl: true } } },
          },
          attachments: { orderBy: { createdAt: 'desc' } },
        },
      }),
      this.prisma.pantryDonor.count({ where }),
    ]);

    return {
      data: data.map((donor) => this.serializeDonor(donor)),
      pagination: {
        page: isAll ? 1 : page,
        limit: isAll ? total : limit,
        total,
        pages: isAll ? (total === 0 ? 0 : 1) : Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async createDonor(tenantId: string, dto: CreatePantryDonorDto) {
    const donor = await this.prisma.pantryDonor.create({
      data: {
        tenantId,
        name: dto.name,
        type: dto.type ?? undefined,
        contact: dto.contact ?? null,
        avatarUrl: normalizeString(dto.avatarUrl),
        tags: serializeTags(dto.tags),
        internalNotes: normalizeString(dto.internalNotes),
      },
      include: {
        comments: {
          orderBy: { createdAt: 'desc' },
          include: { authorUser: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        attachments: { orderBy: { createdAt: 'desc' } },
      },
    });
    return this.serializeDonor(donor);
  }

  async getDonor(tenantId: string, id: string) {
    const donor = await this.prisma.pantryDonor.findFirst({
      where: { id, tenantId },
      include: {
        comments: {
          orderBy: { createdAt: 'desc' },
          include: { authorUser: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        attachments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!donor) {
      throw new NotFoundException('Doador não encontrado');
    }

    return this.serializeDonor(donor);
  }

  async listDonorAuditLogs(
    tenantId: string,
    donorId: string,
    params?: { page?: number; limit?: number },
  ) {
    await this.getDonor(tenantId, donorId);

    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit =
      params?.limit && params.limit > 0 ? Math.min(params.limit, 200) : 50;
    const skip = (page - 1) * limit;

    const entryRows = await this.prisma.pantryEntry.findMany({
      where: { tenantId, donorId },
      select: { id: true },
    });

    const entryIds = entryRows.map((entry) => entry.id);

    const where: Prisma.AuditLogWhereInput = {
      tenantId,
      OR: [
        {
          entity: 'PantryDonor',
          entityId: donorId,
        },
        ...(entryIds.length
          ? [
              {
                entity: 'PantryEntry',
                entityId: { in: entryIds },
              } satisfies Prisma.AuditLogWhereInput,
            ]
          : []),
      ],
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async listEntryAuditLogs(
    tenantId: string,
    entryId: string,
    params?: { page?: number; limit?: number },
  ) {
    await this.getEntry(tenantId, entryId);

    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit =
      params?.limit && params.limit > 0 ? Math.min(params.limit, 200) : 50;
    const skip = (page - 1) * limit;

    const allocationRows = await this.prisma.pantryExitAllocation.findMany({
      where: { tenantId, entryId },
      select: { exitId: true },
    });

    const exitIds = Array.from(new Set(allocationRows.map((row) => row.exitId)));

    const where: Prisma.AuditLogWhereInput = {
      tenantId,
      OR: [
        {
          entity: 'PantryEntry',
          entityId: entryId,
        },
        ...(exitIds.length
          ? [
              {
                entity: 'PantryExit',
                entityId: { in: exitIds },
              } satisfies Prisma.AuditLogWhereInput,
            ]
          : []),
      ],
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async listExitAuditLogs(
    tenantId: string,
    exitId: string,
    params?: { page?: number; limit?: number },
  ) {
    const exit = await this.getExit(tenantId, exitId);

    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit =
      params?.limit && params.limit > 0 ? Math.min(params.limit, 200) : 50;
    const skip = (page - 1) * limit;

    const entryIds = Array.from(
      new Set(
        (exit.allocations ?? [])
          .map((allocation) => allocation.entryId)
          .filter(Boolean),
      ),
    );

    const where: Prisma.AuditLogWhereInput = {
      tenantId,
      OR: [
        {
          entity: 'PantryExit',
          entityId: exitId,
        },
        ...(entryIds.length
          ? [
              {
                entity: 'PantryEntry',
                entityId: { in: entryIds },
              } satisfies Prisma.AuditLogWhereInput,
            ]
          : []),
      ],
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async updateDonor(tenantId: string, id: string, dto: UpdatePantryDonorDto) {
    const donor = await this.prisma.pantryDonor.findFirst({
      where: { id, tenantId },
    });
    if (!donor) {
      throw new NotFoundException('Doador nao encontrado');
    }

    const updated = await this.prisma.pantryDonor.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        contact: dto.contact ?? undefined,
        ...(dto.avatarUrl !== undefined
          ? { avatarUrl: normalizeString(dto.avatarUrl) }
          : {}),
        ...(dto.tags !== undefined ? { tags: serializeTags(dto.tags) } : {}),
        ...(dto.internalNotes !== undefined
          ? { internalNotes: normalizeString(dto.internalNotes) }
          : {}),
      },
      include: {
        comments: {
          orderBy: { createdAt: 'desc' },
          include: { authorUser: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        attachments: { orderBy: { createdAt: 'desc' } },
      },
    });
    return this.serializeDonor(updated);
  }

  async deleteDonor(tenantId: string, id: string) {
    const donor = await this.prisma.pantryDonor.findFirst({
      where: { id, tenantId },
    });
    if (!donor) {
      throw new NotFoundException('Doador nao encontrado');
    }

    await this.prisma.$transaction([
      this.prisma.pantryDonorComment.deleteMany({ where: { tenantId, donorId: id } }),
      this.prisma.pantryDonorAttachment.deleteMany({ where: { tenantId, donorId: id } }),
      this.prisma.pantryDonor.delete({ where: { id } }),
    ]);
    return { ok: true };
  }

  async listEntries(
    tenantId: string,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      itemId?: string;
      donorId?: string;
      from?: string;
      to?: string;
    },
  ) {
    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit =
      params?.limit && params.limit > 0 ? Math.min(params.limit, 200) : 20;
    const skip = (page - 1) * limit;
    const search = normalizeString(params?.search);

    const fromDate = parseDateInput(params?.from);
    const toDate = parseDateInput(params?.to, { endOfDay: true });

    const where: Prisma.PantryEntryWhereInput = {
      tenantId,
      ...(params?.itemId ? { itemId: params.itemId } : {}),
      ...(params?.donorId ? { donorId: params.donorId } : {}),
      ...(fromDate || toDate
        ? {
            entryDate: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { item: { name: { contains: search } } },
              { donor: { name: { contains: search } } },
              { tags: { contains: search } },
              { internalNotes: { contains: search } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.pantryEntry.findMany({
        where,
        orderBy: { entryDate: 'desc' },
        skip,
        take: limit,
        include: {
          item: true,
          donor: true,
          comments: {
            orderBy: { createdAt: 'desc' },
            include: { authorUser: { select: { id: true, name: true, email: true, avatarUrl: true } } },
          },
          attachments: { orderBy: { createdAt: 'desc' } },
        },
      }),
      this.prisma.pantryEntry.count({ where }),
    ]);

    const createdByMap = await this.resolveAuditUserLabels(
      tenantId,
      'PantryEntry',
      data.map((entry) => entry.id),
    );

    const allocationMap = await this.sumExitAllocationsByEntry(
      tenantId,
      data.map((entry) => entry.id),
    );

    return {
      data: data.map((entry) =>
        this.serializeEntry(entry, {
          allocatedTotal: allocationMap.get(entry.id) ?? 0,
          remaining: toNumber(entry.quantity) - (allocationMap.get(entry.id) ?? 0),
          isClosed: toNumber(entry.quantity) - (allocationMap.get(entry.id) ?? 0) <= 0,
          createdBy: createdByMap.get(entry.id) ?? 'Sistema',
        }),
      ),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async createEntry(tenantId: string, dto: CreatePantryEntryDto) {
    await this.assertItem(tenantId, dto.itemId);
    if (dto.donorId) {
      await this.assertDonor(tenantId, dto.donorId);
    }

    const sector = await this.ensureSector(tenantId, dto.sector);

    const created = await this.prisma.pantryEntry.create({
      data: {
        tenantId,
        itemId: dto.itemId,
        donorId: dto.donorId ?? null,
        sector,
        quantity: dto.quantity,
        unit: dto.unit,
        entryDate: parseDateInput(dto.entryDate) ?? new Date(),
        expiryDate: parseDateInput(dto.expiryDate) ?? null,
        notes: dto.notes ?? null,
        tags: serializeTags(dto.tags),
        internalNotes: normalizeString(dto.internalNotes),
      },
      include: {
        item: true,
        donor: true,
        comments: {
          orderBy: { createdAt: 'desc' },
          include: { authorUser: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        attachments: { orderBy: { createdAt: 'desc' } },
      },
    });
    return this.serializeEntry(created);
  }

  async updateEntry(tenantId: string, id: string, dto: UpdatePantryEntryDto) {
    const entry = await this.prisma.pantryEntry.findFirst({
      where: { id, tenantId },
    });
    if (!entry) {
      throw new NotFoundException('Entrada nao encontrada');
    }

    const allocations = await this.prisma.pantryExitAllocation.count({
      where: { tenantId, entryId: id },
    });

    if (
      allocations > 0 &&
      (dto.itemId !== undefined ||
        dto.sector !== undefined ||
        dto.quantity !== undefined ||
        dto.unit !== undefined ||
        dto.entryDate !== undefined ||
        dto.expiryDate !== undefined)
    ) {
      throw new BadRequestException(
        'Entrada possui saidas vinculadas e nao pode ter lote/quantidade alterados.',
      );
    }

    if (dto.itemId) {
      await this.assertItem(tenantId, dto.itemId);
    }
    if (dto.donorId) {
      await this.assertDonor(tenantId, dto.donorId);
    }

    const sector =
      dto.sector !== undefined ? await this.ensureSector(tenantId, dto.sector) : undefined;

    const updated = await this.prisma.pantryEntry.update({
      where: { id },
      data: {
        itemId: dto.itemId,
        donorId: dto.donorId ?? undefined,
        sector,
        quantity: dto.quantity,
        unit: dto.unit,
        entryDate: dto.entryDate ? parseDateInput(dto.entryDate) : undefined,
        expiryDate:
          dto.expiryDate === null
            ? null
            : dto.expiryDate
              ? parseDateInput(dto.expiryDate)
              : undefined,
        notes: dto.notes ?? undefined,
        tags: dto.tags !== undefined ? serializeTags(dto.tags) : undefined,
        internalNotes:
          dto.internalNotes !== undefined ? normalizeString(dto.internalNotes) : undefined,
      },
      include: {
        item: true,
        donor: true,
        comments: {
          orderBy: { createdAt: 'desc' },
          include: { authorUser: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        attachments: { orderBy: { createdAt: 'desc' } },
      },
    });
    return this.serializeEntry(updated);
  }

  async deleteEntry(tenantId: string, id: string) {
    const entry = await this.prisma.pantryEntry.findFirst({
      where: { id, tenantId },
    });
    if (!entry) {
      throw new NotFoundException('Entrada nao encontrada');
    }

    const allocations = await this.prisma.pantryExitAllocation.count({
      where: { tenantId, entryId: id },
    });
    if (allocations > 0) {
      throw new BadRequestException(
        'Entrada possui saidas vinculadas e nao pode ser removida.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.pantryEntryComment.deleteMany({ where: { tenantId, entryId: id } }),
      this.prisma.pantryEntryAttachment.deleteMany({ where: { tenantId, entryId: id } }),
      this.prisma.pantryEntry.delete({ where: { id } }),
    ]);
    return { ok: true };
  }

  async listExits(
    tenantId: string,
    params?: {
      page?: number;
      limit?: number;
      search?: string;
      itemId?: string;
      type?: string;
      from?: string;
      to?: string;
    },
  ) {
    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit =
      params?.limit && params.limit > 0 ? Math.min(params.limit, 200) : 20;
    const skip = (page - 1) * limit;
    const search = normalizeString(params?.search);
    const fromDate = parseDateInput(params?.from);
    const toDate = parseDateInput(params?.to, { endOfDay: true });

    const where: Prisma.PantryExitWhereInput = {
      tenantId,
      ...(params?.itemId ? { itemId: params.itemId } : {}),
      ...(params?.type ? { type: params.type as any } : {}),
      ...(fromDate || toDate
        ? {
            exitDate: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { item: { name: { contains: search } } },
              { eventName: { contains: search } },
              { tags: { contains: search } },
              { internalNotes: { contains: search } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.pantryExit.findMany({
        where,
        orderBy: { exitDate: 'desc' },
        skip,
        take: limit,
        include: {
          item: true,
          allocations: {
            include: {
              entry: { select: { id: true, expiryDate: true, sector: true } },
            },
          },
          comments: {
            orderBy: { createdAt: 'desc' },
            include: { authorUser: { select: { id: true, name: true, email: true, avatarUrl: true } } },
          },
          attachments: { orderBy: { createdAt: 'desc' } },
        },
      }),
      this.prisma.pantryExit.count({ where }),
    ]);

    const removedByMap = await this.resolveAuditUserLabels(
      tenantId,
      'PantryExit',
      data.map((exit) => exit.id),
    );

    return {
      data: data.map((exit) =>
        this.serializeExit(exit, {
          removedBy: removedByMap.get(exit.id) ?? 'Sistema',
        }),
      ),
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getExit(tenantId: string, id: string) {
    const exit = await this.prisma.pantryExit.findFirst({
      where: { id, tenantId },
      include: {
        item: { select: { id: true, name: true, unit: true, group: true } },
        allocations: {
          include: {
            entry: {
              select: { id: true, expiryDate: true, sector: true, entryDate: true },
            },
          },
        },
        comments: {
          orderBy: { createdAt: 'desc' },
          include: { authorUser: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        attachments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!exit) {
      throw new NotFoundException('Saida nao encontrada');
    }

    const removedByMap = await this.resolveAuditUserLabels(tenantId, 'PantryExit', [id]);

    return this.serializeExit(exit, {
      removedBy: removedByMap.get(exit.id) ?? 'Sistema',
    });
  }

  private async resolveOpenEntriesForExitAllocation(params: {
    tenantId: string;
    itemId: string;
    sector: string;
    excludeExitId?: string;
    client?: Prisma.TransactionClient;
  }) {
    const normalizedSector = normalizeSector(params.sector);
    const client = params.client ?? this.prisma;

    const entries = await client.pantryEntry.findMany({
      where: {
        tenantId: params.tenantId,
        itemId: params.itemId,
        sector: normalizedSector,
      },
      orderBy: [{ entryDate: 'asc' }],
      select: {
        id: true,
        quantity: true,
        unit: true,
        entryDate: true,
        expiryDate: true,
        sector: true,
      },
    });

    const allocationMap = await this.sumExitAllocationsByEntry(
      params.tenantId,
      entries.map((entry) => entry.id),
      { excludeExitId: params.excludeExitId, client },
    );

    return entries
      .map((entry) => ({
        ...entry,
        remaining:
          toNumber(entry.quantity) - (allocationMap.get(entry.id) ?? 0),
      }))
      .filter((entry) => entry.remaining > 0)
      .sort((a, b) => {
        const aExpiry = a.expiryDate
          ? a.expiryDate.getTime()
          : Number.MAX_SAFE_INTEGER;
        const bExpiry = b.expiryDate
          ? b.expiryDate.getTime()
          : Number.MAX_SAFE_INTEGER;
        if (aExpiry !== bExpiry) return aExpiry - bExpiry;
        return a.entryDate.getTime() - b.entryDate.getTime();
      });
  }

  async createExit(tenantId: string, dto: CreatePantryExitDto) {
    await this.assertItem(tenantId, dto.itemId);

    const normalizedSector = normalizeSector(dto.sector);
    const exitDate = parseDateInput(dto.exitDate) ?? new Date();

    const createdExitId = await this.prisma.$transaction(async (trx) => {
      await this.ensureSector(tenantId, normalizedSector, { client: trx });
      const exit = await trx.pantryExit.create({
        data: {
          tenantId,
          itemId: dto.itemId,
          sector: normalizedSector,
          quantity: dto.quantity,
          unit: dto.unit,
          exitDate,
          type: dto.type ?? undefined,
          eventName: dto.eventName ?? null,
          notes: dto.notes ?? null,
          tags: serializeTags(dto.tags),
          internalNotes: normalizeString(dto.internalNotes),
        },
        include: { item: true },
      });

      if (dto.entryId) {
        const entry = await trx.pantryEntry.findFirst({
          where: {
            id: dto.entryId,
            tenantId,
            itemId: dto.itemId,
            sector: normalizedSector,
          },
          select: { id: true, quantity: true },
        });
        if (!entry) {
          throw new BadRequestException(
            'Entrada/lote nao encontrado para esta saida.',
          );
        }

        const allocatedMap = await this.sumExitAllocationsByEntry(tenantId, [
          entry.id,
        ], { client: trx });
        const remaining =
          toNumber(entry.quantity) - (allocatedMap.get(entry.id) ?? 0);
        if (dto.quantity > remaining) {
          throw new BadRequestException(
            `Saldo insuficiente no lote selecionado (disponivel: ${remaining}).`,
          );
        }

        await trx.pantryExitAllocation.create({
          data: {
            tenantId,
            exitId: exit.id,
            entryId: entry.id,
            quantity: dto.quantity,
          },
        });

        return exit.id;
      }

      const openEntries = await this.resolveOpenEntriesForExitAllocation({
        tenantId,
        itemId: dto.itemId,
        sector: normalizedSector,
        client: trx,
      });

      let remainingToAllocate = dto.quantity;
      const allocations: Array<{ entryId: string; quantity: number }> = [];

      for (const entry of openEntries) {
        if (remainingToAllocate <= 0) break;
        const qty = Math.min(entry.remaining, remainingToAllocate);
        if (qty <= 0) continue;
        allocations.push({ entryId: entry.id, quantity: qty });
        remainingToAllocate -= qty;
      }

      if (remainingToAllocate > 0) {
        throw new BadRequestException(
          `Saldo insuficiente no setor "${normalizedSector}" para esta saida.`,
        );
      }

      if (allocations.length) {
        await trx.pantryExitAllocation.createMany({
          data: allocations.map((allocation) => ({
            tenantId,
            exitId: exit.id,
            entryId: allocation.entryId,
            quantity: allocation.quantity,
          })),
        });
      }

      return exit.id;
    });

    return this.getExit(tenantId, createdExitId);
  }

  async updateExit(tenantId: string, id: string, dto: UpdatePantryExitDto) {
    const exit = await this.prisma.pantryExit.findFirst({
      where: { id, tenantId },
    });
    if (!exit) {
      throw new NotFoundException('Saida nao encontrada');
    }

    if (dto.itemId) {
      await this.assertItem(tenantId, dto.itemId);
    }

    const currentQuantity = toNumber(exit.quantity);
    const currentItemId = exit.itemId;
    const currentSector = normalizeSector(exit.sector);

    const nextItemId = dto.itemId ?? currentItemId;
    const nextSector = normalizeSector(dto.sector ?? exit.sector);
    const nextQuantity = dto.quantity ?? currentQuantity;

    const updatedExitId = await this.prisma.$transaction(async (trx) => {
      if (dto.sector !== undefined) {
        await this.ensureSector(tenantId, nextSector, { client: trx });
      }
      await trx.pantryExitAllocation.deleteMany({
        where: { tenantId, exitId: id },
      });

      const updated = await trx.pantryExit.update({
        where: { id },
        data: {
          itemId: dto.itemId,
          sector: dto.sector !== undefined ? normalizeSector(dto.sector) : undefined,
          quantity: dto.quantity,
          unit: dto.unit,
          exitDate: dto.exitDate ? parseDateInput(dto.exitDate) : undefined,
          type: dto.type,
          eventName: dto.eventName ?? undefined,
          notes: dto.notes ?? undefined,
          tags: dto.tags !== undefined ? serializeTags(dto.tags) : undefined,
          internalNotes:
            dto.internalNotes !== undefined ? normalizeString(dto.internalNotes) : undefined,
        },
        include: { item: true },
      });

      if (dto.entryId) {
        const entry = await trx.pantryEntry.findFirst({
          where: {
            id: dto.entryId,
            tenantId,
            itemId: nextItemId,
            sector: nextSector,
          },
          select: { id: true, quantity: true },
        });
        if (!entry) {
          throw new BadRequestException(
            'Entrada/lote nao encontrado para esta saida.',
          );
        }

        const allocatedMap = await this.sumExitAllocationsByEntry(tenantId, [
          entry.id,
        ], { client: trx });
        const remaining =
          toNumber(entry.quantity) - (allocatedMap.get(entry.id) ?? 0);
        if (nextQuantity > remaining) {
          throw new BadRequestException(
            `Saldo insuficiente no lote selecionado (disponivel: ${remaining}).`,
          );
        }

        await trx.pantryExitAllocation.create({
          data: {
            tenantId,
            exitId: id,
            entryId: entry.id,
            quantity: nextQuantity,
          },
        });

        return updated.id;
      }

      const openEntries = await this.resolveOpenEntriesForExitAllocation({
        tenantId,
        itemId: nextItemId,
        sector: nextSector,
        excludeExitId: id,
        client: trx,
      });

      let remainingToAllocate = nextQuantity;
      const allocations: Array<{ entryId: string; quantity: number }> = [];

      for (const entry of openEntries) {
        if (remainingToAllocate <= 0) break;
        const qty = Math.min(entry.remaining, remainingToAllocate);
        if (qty <= 0) continue;
        allocations.push({ entryId: entry.id, quantity: qty });
        remainingToAllocate -= qty;
      }

      if (remainingToAllocate > 0) {
        throw new BadRequestException(
          `Saldo insuficiente no setor "${nextSector}" para esta saida.`,
        );
      }

      if (allocations.length) {
        await trx.pantryExitAllocation.createMany({
          data: allocations.map((allocation) => ({
            tenantId,
            exitId: id,
            entryId: allocation.entryId,
            quantity: allocation.quantity,
          })),
        });
      }

      return updated.id;
    });

    return this.getExit(tenantId, updatedExitId);
  }

  async deleteExit(tenantId: string, id: string) {
    const exit = await this.prisma.pantryExit.findFirst({
      where: { id, tenantId },
    });
    if (!exit) {
      throw new NotFoundException('Saida nao encontrada');
    }

    await this.prisma.$transaction([
      this.prisma.pantryExitComment.deleteMany({ where: { tenantId, exitId: id } }),
      this.prisma.pantryExitAttachment.deleteMany({ where: { tenantId, exitId: id } }),
      this.prisma.pantryExitAllocation.deleteMany({ where: { tenantId, exitId: id } }),
      this.prisma.pantryExit.delete({ where: { id } }),
    ]);
    return { ok: true };
  }

  async addItemComment(
    tenantId: string,
    itemId: string,
    dto: CreatePantryItemCommentDto,
    actorUserId?: string,
  ) {
    await this.getItem(tenantId, itemId);
    await this.prisma.pantryItemComment.create({
      data: {
        tenantId,
        itemId,
        authorUserId: actorUserId ?? null,
        body: dto.body.trim(),
        mentionUserIds: await this.resolveMentionUserIds(tenantId, dto.mentionUserIds),
      },
    });
    return this.getItem(tenantId, itemId);
  }

  async deleteItemComment(tenantId: string, itemId: string, commentId: string) {
    await this.getItem(tenantId, itemId);
    await this.prisma.pantryItemComment.deleteMany({ where: { tenantId, itemId, id: commentId } });
    return this.getItem(tenantId, itemId);
  }

  async addItemAttachment(
    tenantId: string,
    itemId: string,
    dto: CreatePantryItemAttachmentDto,
    actorUserId?: string,
  ) {
    await this.getItem(tenantId, itemId);
    await this.prisma.pantryItemAttachment.create({
      data: {
        tenantId,
        itemId,
        uploadedByUserId: actorUserId ?? null,
        label: dto.label.trim(),
        filePath: dto.filePath,
        mimeType: dto.mimeType ?? null,
        fileSizeBytes: dto.fileSizeBytes ?? null,
      },
    });
    return this.getItem(tenantId, itemId);
  }

  async deleteItemAttachment(tenantId: string, itemId: string, attachmentId: string) {
    await this.getItem(tenantId, itemId);
    await this.prisma.pantryItemAttachment.deleteMany({
      where: { tenantId, itemId, id: attachmentId },
    });
    return this.getItem(tenantId, itemId);
  }

  async addDonorComment(
    tenantId: string,
    donorId: string,
    dto: CreatePantryDonorCommentDto,
    actorUserId?: string,
  ) {
    await this.getDonor(tenantId, donorId);
    await this.prisma.pantryDonorComment.create({
      data: {
        tenantId,
        donorId,
        authorUserId: actorUserId ?? null,
        body: dto.body.trim(),
        mentionUserIds: await this.resolveMentionUserIds(tenantId, dto.mentionUserIds),
      },
    });
    return this.getDonor(tenantId, donorId);
  }

  async deleteDonorComment(tenantId: string, donorId: string, commentId: string) {
    await this.getDonor(tenantId, donorId);
    await this.prisma.pantryDonorComment.deleteMany({ where: { tenantId, donorId, id: commentId } });
    return this.getDonor(tenantId, donorId);
  }

  async addDonorAttachment(
    tenantId: string,
    donorId: string,
    dto: CreatePantryDonorAttachmentDto,
    actorUserId?: string,
  ) {
    await this.getDonor(tenantId, donorId);
    await this.prisma.pantryDonorAttachment.create({
      data: {
        tenantId,
        donorId,
        uploadedByUserId: actorUserId ?? null,
        label: dto.label.trim(),
        filePath: dto.filePath,
        mimeType: dto.mimeType ?? null,
        fileSizeBytes: dto.fileSizeBytes ?? null,
      },
    });
    return this.getDonor(tenantId, donorId);
  }

  async deleteDonorAttachment(tenantId: string, donorId: string, attachmentId: string) {
    await this.getDonor(tenantId, donorId);
    await this.prisma.pantryDonorAttachment.deleteMany({
      where: { tenantId, donorId, id: attachmentId },
    });
    return this.getDonor(tenantId, donorId);
  }

  async addEntryComment(
    tenantId: string,
    entryId: string,
    dto: CreatePantryEntryCommentDto,
    actorUserId?: string,
  ) {
    await this.getEntry(tenantId, entryId);
    await this.prisma.pantryEntryComment.create({
      data: {
        tenantId,
        entryId,
        authorUserId: actorUserId ?? null,
        body: dto.body.trim(),
        mentionUserIds: await this.resolveMentionUserIds(tenantId, dto.mentionUserIds),
      },
    });
    return this.getEntry(tenantId, entryId);
  }

  async deleteEntryComment(tenantId: string, entryId: string, commentId: string) {
    await this.getEntry(tenantId, entryId);
    await this.prisma.pantryEntryComment.deleteMany({ where: { tenantId, entryId, id: commentId } });
    return this.getEntry(tenantId, entryId);
  }

  async addEntryAttachment(
    tenantId: string,
    entryId: string,
    dto: CreatePantryEntryAttachmentDto,
    actorUserId?: string,
  ) {
    await this.getEntry(tenantId, entryId);
    await this.prisma.pantryEntryAttachment.create({
      data: {
        tenantId,
        entryId,
        uploadedByUserId: actorUserId ?? null,
        label: dto.label.trim(),
        filePath: dto.filePath,
        mimeType: dto.mimeType ?? null,
        fileSizeBytes: dto.fileSizeBytes ?? null,
      },
    });
    return this.getEntry(tenantId, entryId);
  }

  async deleteEntryAttachment(tenantId: string, entryId: string, attachmentId: string) {
    await this.getEntry(tenantId, entryId);
    await this.prisma.pantryEntryAttachment.deleteMany({
      where: { tenantId, entryId, id: attachmentId },
    });
    return this.getEntry(tenantId, entryId);
  }

  async addExitComment(
    tenantId: string,
    exitId: string,
    dto: CreatePantryExitCommentDto,
    actorUserId?: string,
  ) {
    await this.getExit(tenantId, exitId);
    await this.prisma.pantryExitComment.create({
      data: {
        tenantId,
        exitId,
        authorUserId: actorUserId ?? null,
        body: dto.body.trim(),
        mentionUserIds: await this.resolveMentionUserIds(tenantId, dto.mentionUserIds),
      },
    });
    return this.getExit(tenantId, exitId);
  }

  async deleteExitComment(tenantId: string, exitId: string, commentId: string) {
    await this.getExit(tenantId, exitId);
    await this.prisma.pantryExitComment.deleteMany({ where: { tenantId, exitId, id: commentId } });
    return this.getExit(tenantId, exitId);
  }

  async addExitAttachment(
    tenantId: string,
    exitId: string,
    dto: CreatePantryExitAttachmentDto,
    actorUserId?: string,
  ) {
    await this.getExit(tenantId, exitId);
    await this.prisma.pantryExitAttachment.create({
      data: {
        tenantId,
        exitId,
        uploadedByUserId: actorUserId ?? null,
        label: dto.label.trim(),
        filePath: dto.filePath,
        mimeType: dto.mimeType ?? null,
        fileSizeBytes: dto.fileSizeBytes ?? null,
      },
    });
    return this.getExit(tenantId, exitId);
  }

  async deleteExitAttachment(tenantId: string, exitId: string, attachmentId: string) {
    await this.getExit(tenantId, exitId);
    await this.prisma.pantryExitAttachment.deleteMany({
      where: { tenantId, exitId, id: attachmentId },
    });
    return this.getExit(tenantId, exitId);
  }

  async getSummary(tenantId: string) {
    const [items, donors, entryTotals, exitTotals] = await this.prisma.$transaction([
      this.prisma.pantryItem.findMany({
        where: { tenantId },
        orderBy: { name: 'asc' },
      }),
      this.prisma.pantryDonor.count({ where: { tenantId } }),
      this.prisma.pantryEntry.aggregate({
        where: { tenantId },
        _sum: { quantity: true },
      }),
      this.prisma.pantryExit.aggregate({
        where: { tenantId },
        _sum: { quantity: true },
      }),
    ]);

    const itemsWithStats = await this.enrichItems(tenantId, items);
    const totalStock = itemsWithStats.reduce(
      (sum, item) => sum + item.stock,
      0,
    );
    const lowStock = itemsWithStats.filter((item) => item.isBelowMin).length;

    const validity = {
      normal: 0,
      attention: 0,
      alert: 0,
      urgent: 0,
      expired: 0,
      noExpiry: 0,
    };

    itemsWithStats.forEach((item) => {
      switch (item.validityStatus) {
        case 'Normal':
          validity.normal += 1;
          break;
        case 'Atencao':
          validity.attention += 1;
          break;
        case 'Alerta':
          validity.alert += 1;
          break;
        case 'Urgente':
          validity.urgent += 1;
          break;
        case 'Vencido':
          validity.expired += 1;
          break;
        default:
          validity.noExpiry += 1;
          break;
      }
    });

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const [recentEntries, recentExits] = await this.prisma.$transaction([
      this.prisma.pantryEntry.findMany({
        where: { tenantId, entryDate: { gte: start } },
        select: { entryDate: true, quantity: true },
      }),
      this.prisma.pantryExit.findMany({
        where: { tenantId, exitDate: { gte: start } },
        select: { exitDate: true, quantity: true, type: true, itemId: true },
      }),
    ]);

    const months: { key: string; label: string }[] = [];
    for (let i = 11; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: resolveMonthKey(date), label: resolveMonthLabel(date) });
    }

    const monthTotals = new Map<string, { entries: number; exits: number; label: string }>();
    months.forEach((month) => {
      monthTotals.set(month.key, { entries: 0, exits: 0, label: month.label });
    });

    recentEntries.forEach((entry) => {
      const key = resolveMonthKey(entry.entryDate);
      const current = monthTotals.get(key);
      if (current) {
        current.entries += toNumber(entry.quantity);
      }
    });

    recentExits.forEach((exit) => {
      const key = resolveMonthKey(exit.exitDate);
      const current = monthTotals.get(key);
      if (current) {
        current.exits += toNumber(exit.quantity);
      }
    });

    const monthly = months.map((month) => ({
      month: month.key,
      label: monthTotals.get(month.key)?.label ?? month.label,
      entries: monthTotals.get(month.key)?.entries ?? 0,
      exits: monthTotals.get(month.key)?.exits ?? 0,
    }));

    const [exitByItem, exitByType, entryByDonor] = await this.prisma.$transaction([
      this.prisma.pantryExit.groupBy({
        by: ['itemId'],
        where: { tenantId },
        orderBy: { itemId: 'asc' },
        _sum: { quantity: true },
      }),
      this.prisma.pantryExit.groupBy({
        by: ['type'],
        where: { tenantId },
        orderBy: { type: 'asc' },
        _sum: { quantity: true },
      }),
      this.prisma.pantryEntry.groupBy({
        by: ['donorId'],
        where: { tenantId, donorId: { not: null } },
        orderBy: { donorId: 'asc' },
        _sum: { quantity: true },
      }),
    ]);

    const itemIds = exitByItem.map((item) => item.itemId);
    const donorIds = entryByDonor
      .map((entry) => entry.donorId)
      .filter((id): id is string => Boolean(id));

    const [itemsForExit, donorsForEntry] = await Promise.all([
      itemIds.length
        ? this.prisma.pantryItem.findMany({
            where: { tenantId, id: { in: itemIds } },
            select: { id: true, name: true, unit: true },
          })
        : Promise.resolve([] as Array<{ id: string; name: string; unit: string }>),
      donorIds.length
        ? this.prisma.pantryDonor.findMany({
            where: { tenantId, id: { in: donorIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([] as Array<{ id: string; name: string }>),
    ]);

    const itemMap = new Map(itemsForExit.map((item) => [item.id, item]));
    const donorMap = new Map(donorsForEntry.map((donor) => [donor.id, donor]));

    const consumptionByItem = exitByItem
      .map((entry) => {
        const item = itemMap.get(entry.itemId);
        return {
          itemId: entry.itemId,
          name: item?.name ?? 'Sem nome',
          unit: item?.unit ?? '',
          total: toNumber(entry._sum?.quantity),
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const consumptionByType = exitByType.map((entry) => ({
      type: entry.type ?? 'ATTENDED',
      total: toNumber(entry._sum?.quantity),
    }));

    const entriesByDonor = entryByDonor
      .map((entry) => {
        const donor = entry.donorId ? donorMap.get(entry.donorId) : null;
        return {
          donorId: entry.donorId ?? '',
          name: donor?.name ?? 'Sem nome',
          total: toNumber(entry._sum?.quantity),
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    return {
      totals: {
        items: items.length,
        donors,
        entries: toNumber(entryTotals._sum?.quantity),
        exits: toNumber(exitTotals._sum?.quantity),
        stock: totalStock,
        lowStock,
      },
      validity,
      monthly,
      consumptionByType,
      consumptionByItem,
      entriesByDonor,
    };
  }

  private async buildSectorStats(
    tenantId: string,
    itemIds: string[],
  ): Promise<
    Map<
      string,
      Array<{
        itemId: string;
        sector: string;
        entriesTotal: number;
        exitsTotal: number;
        stock: number;
        lastEntryDate: Date | null;
        lastExitDate: Date | null;
        nextExpiryDate: Date | null;
        nextExpiryEntryId: string | null;
        validityStatus: string;
        daysToExpire: number | null;
      }>
    >
  > {
    if (!itemIds.length) return new Map();

    const [entryGroups, exitGroups, entriesWithExpiry] =
      await this.prisma.$transaction([
        this.prisma.pantryEntry.groupBy({
          by: ['itemId', 'sector'],
          where: { tenantId, itemId: { in: itemIds } },
          orderBy: [{ itemId: 'asc' }, { sector: 'asc' }],
          _sum: { quantity: true },
          _max: { entryDate: true },
        }),
        this.prisma.pantryExit.groupBy({
          by: ['itemId', 'sector'],
          where: { tenantId, itemId: { in: itemIds } },
          orderBy: [{ itemId: 'asc' }, { sector: 'asc' }],
          _sum: { quantity: true },
          _max: { exitDate: true },
        }),
        this.prisma.pantryEntry.findMany({
          where: { tenantId, itemId: { in: itemIds }, expiryDate: { not: null } },
          select: { id: true, itemId: true, sector: true, expiryDate: true, quantity: true },
        }),
      ]);

    const keyOf = (itemId: string, sector: string) => `${itemId}::${sector}`;

    const base = new Map<
      string,
      {
        itemId: string;
        sector: string;
        entriesTotal: number;
        exitsTotal: number;
        lastEntryDate: Date | null;
        lastExitDate: Date | null;
        nextExpiryDate: Date | null;
        nextExpiryEntryId: string | null;
      }
    >();

    entryGroups.forEach((entry) => {
      const sector = normalizeSector(entry.sector);
      base.set(keyOf(entry.itemId, sector), {
        itemId: entry.itemId,
        sector,
        entriesTotal: toNumber(entry._sum?.quantity),
        exitsTotal: 0,
        lastEntryDate: entry._max?.entryDate ?? null,
        lastExitDate: null,
        nextExpiryDate: null,
        nextExpiryEntryId: null,
      });
    });

    exitGroups.forEach((exit) => {
      const sector = normalizeSector(exit.sector);
      const key = keyOf(exit.itemId, sector);
      const current =
        base.get(key) ??
        ({
          itemId: exit.itemId,
          sector,
          entriesTotal: 0,
          exitsTotal: 0,
          lastEntryDate: null,
          lastExitDate: null,
          nextExpiryDate: null,
          nextExpiryEntryId: null,
        } as const);
      base.set(key, {
        ...current,
        exitsTotal: toNumber(exit._sum?.quantity),
        lastExitDate: exit._max?.exitDate ?? null,
      });
    });

    const allocationMap = await this.sumExitAllocationsByEntry(
      tenantId,
      entriesWithExpiry.map((entry) => entry.id),
    );
    const { bySector } = this.resolveOpenEntryExpiryMaps(
      entriesWithExpiry,
      allocationMap,
    );

    bySector.forEach((value, sectorKey) => {
      const current = base.get(sectorKey);
      if (!current) return;
      base.set(sectorKey, {
        ...current,
        nextExpiryDate: value.date,
        nextExpiryEntryId: value.entryId,
      });
    });

    const map = new Map<
      string,
      Array<{
        itemId: string;
        sector: string;
        entriesTotal: number;
        exitsTotal: number;
        stock: number;
        lastEntryDate: Date | null;
        lastExitDate: Date | null;
        nextExpiryDate: Date | null;
        nextExpiryEntryId: string | null;
        validityStatus: string;
        daysToExpire: number | null;
      }>
    >();

    Array.from(base.values()).forEach((row) => {
      const stock = row.entriesTotal - row.exitsTotal;
      const nextExpiryDate = row.nextExpiryDate ?? null;
      const itemRows = map.get(row.itemId) ?? [];
      itemRows.push({
        itemId: row.itemId,
        sector: row.sector,
        entriesTotal: row.entriesTotal,
        exitsTotal: row.exitsTotal,
        stock,
        lastEntryDate: row.lastEntryDate,
        lastExitDate: row.lastExitDate,
        nextExpiryDate,
        nextExpiryEntryId: row.nextExpiryEntryId,
        validityStatus: resolveValidityStatus(nextExpiryDate),
        daysToExpire: resolveDaysToExpire(nextExpiryDate),
      });
      map.set(row.itemId, itemRows);
    });

    // sort: highest stock first, then sector name
    map.forEach((rows, itemId) => {
      map.set(
        itemId,
        rows.sort((a, b) => {
          if (b.stock !== a.stock) return b.stock - a.stock;
          return a.sector.localeCompare(b.sector);
        }),
      );
    });

    return map;
  }

  async listItemSectors(tenantId: string, itemId: string) {
    await this.assertItem(tenantId, itemId);
    const sectorMap = await this.buildSectorStats(tenantId, [itemId]);
    const sectors = sectorMap.get(itemId) ?? [];
    return {
      itemId,
      sectors: sectors.map((sector) => ({
        sector: sector.sector,
        stock: sector.stock,
        entriesTotal: sector.entriesTotal,
        exitsTotal: sector.exitsTotal,
        nextExpiryDate: sector.nextExpiryDate,
        nextExpiryEntryId: sector.nextExpiryEntryId,
        validityStatus: sector.validityStatus,
        daysToExpire: sector.daysToExpire,
      })),
    };
  }

  async getDashboard(tenantId: string) {
    const items = await this.prisma.pantryItem.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });

    const sectorMap = await this.buildSectorStats(
      tenantId,
      items.map((item) => item.id),
    );

    const enriched = await this.enrichItems(tenantId, items);
    const enrichedMap = new Map(enriched.map((item) => [item.id, item]));

    const stockRows = items.flatMap((item) => {
      const itemStats = enrichedMap.get(item.id);
      const sectors = sectorMap.get(item.id) ?? [];
      if (!sectors.length) {
        return [
          {
            itemId: item.id,
            name: item.name,
            group: item.group,
            tags: parseTags((item as { tags?: string | null }).tags ?? null),
            unit: item.unit,
            sector: 'Geral',
            sectorStock: 0,
            itemStock: itemStats?.stock ?? 0,
            minStock: itemStats?.minStock ?? toNumber(item.minStock),
            isBelowMin: itemStats?.isBelowMin ?? false,
            nextExpiryDate: null as Date | null,
            validityStatus: 'Sem validade',
            daysToExpire: null as number | null,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          },
        ];
      }

      return sectors.map((sector) => ({
        itemId: item.id,
        name: item.name,
        group: item.group,
        tags: parseTags((item as { tags?: string | null }).tags ?? null),
        unit: item.unit,
        sector: sector.sector,
        sectorStock: sector.stock,
        itemStock: itemStats?.stock ?? 0,
        minStock: itemStats?.minStock ?? toNumber(item.minStock),
        isBelowMin: itemStats?.isBelowMin ?? false,
        nextExpiryDate: sector.nextExpiryDate,
        validityStatus: sector.validityStatus,
        daysToExpire: sector.daysToExpire,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
    });

    const [recentEntries, recentExits] = await this.prisma.$transaction([
      this.prisma.pantryEntry.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: {
          item: { select: { id: true, name: true, unit: true, group: true } },
          donor: { select: { id: true, name: true } },
        },
      }),
      this.prisma.pantryExit.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: {
          item: { select: { id: true, name: true, unit: true, group: true } },
        },
      }),
    ]);

    const createdByMap = await this.resolveAuditUserLabels(
      tenantId,
      'PantryEntry',
      recentEntries.map((entry) => entry.id),
    );

    const removedByMap = await this.resolveAuditUserLabels(
      tenantId,
      'PantryExit',
      recentExits.map((exit) => exit.id),
    );

    const now = new Date();
    const expiringLimit = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringSectors = stockRows
      .filter(
        (row) =>
          row.sectorStock > 0 &&
          row.nextExpiryDate &&
          row.nextExpiryDate <= expiringLimit,
      )
      .sort((a, b) => (a.daysToExpire ?? 9999) - (b.daysToExpire ?? 9999))
      .slice(0, 20);

    return {
      totals: {
        items: items.length,
        stock: enriched.reduce((sum, item) => sum + item.stock, 0),
        lowStock: enriched.filter((item) => item.isBelowMin).length,
      },
      stockRows,
      recentEntries: recentEntries.map((entry) => ({
        id: entry.id,
        itemId: entry.itemId,
        item: entry.item,
        donor: entry.donor,
        sector: normalizeSector(entry.sector),
        quantity: toNumber(entry.quantity),
        unit: entry.unit,
        entryDate: entry.entryDate,
        createdAt: entry.createdAt,
        expiryDate: entry.expiryDate,
        notes: entry.notes,
        createdBy: createdByMap.get(entry.id) ?? 'Sistema',
      })),
      recentExits: recentExits.map((exit) => ({
        id: exit.id,
        itemId: exit.itemId,
        item: exit.item,
        sector: normalizeSector(exit.sector),
        quantity: toNumber(exit.quantity),
        unit: exit.unit,
        exitDate: exit.exitDate,
        createdAt: exit.createdAt,
        type: exit.type,
        eventName: exit.eventName,
        notes: exit.notes,
        removedBy: removedByMap.get(exit.id) ?? 'Sistema',
      })),
      expiring: expiringSectors.map((row) => ({
        itemId: row.itemId,
        name: row.name,
        unit: row.unit,
        group: row.group,
        sector: row.sector,
        stock: row.sectorStock,
        nextExpiryDate: row.nextExpiryDate,
        validityStatus: row.validityStatus,
        daysToExpire: row.daysToExpire,
      })),
    };
  }

  async getConsumption(
    tenantId: string,
    query: {
      from?: string;
      to?: string;
      view?: 'item' | 'group';
      itemId?: string;
      group?: string;
      type?: 'ATTENDED' | 'DONATION' | 'EVENT' | 'PARTY' | 'CORRECTION';
      eventName?: string;
    },
  ) {
    const view = query.view ?? 'item';
    const eventName = normalizeString(query.eventName);

    const now = new Date();
    const fromDate =
      parseDateInput(query.from) ?? new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const toDate = parseDateInput(query.to, { endOfDay: true }) ?? now;

    const exits = await this.prisma.pantryExit.findMany({
      where: {
        tenantId,
        exitDate: { gte: fromDate, lte: toDate },
        ...(query.itemId ? { itemId: query.itemId } : {}),
        ...(query.type ? { type: query.type } : { type: { not: 'CORRECTION' } }),
        ...(eventName ? { eventName: { contains: eventName } } : {}),
        ...(view === 'group' && query.group
          ? { item: { group: query.group } }
          : {}),
      },
      include: {
        item: { select: { id: true, name: true, group: true } },
      },
      orderBy: { exitDate: 'asc' },
    });

    const months: { key: string; label: string; start: Date }[] = [];
    const startMonth = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
    const endMonth = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
    for (
      let cursor = new Date(startMonth);
      cursor <= endMonth;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    ) {
      months.push({
        key: resolveMonthKey(cursor),
        label: resolveMonthLabel(cursor),
        start: cursor,
      });
    }

    const monthIndex = new Map(months.map((m, idx) => [m.key, idx]));

    const totalsByDimension = new Map<
      string,
      { label: string; totals: number[]; total: number }
    >();

    const resolveDimension = (exit: (typeof exits)[number]) => {
      if (view === 'group') {
        const label = (exit.item.group ?? 'Sem grupo').trim() || 'Sem grupo';
        return { key: `group:${label}`, label };
      }
      return { key: exit.item.id, label: exit.item.name };
    };

    exits.forEach((exit) => {
      const monthKey = resolveMonthKey(exit.exitDate);
      const idx = monthIndex.get(monthKey);
      if (idx === undefined) return;
      const dimension = resolveDimension(exit);
      const current =
        totalsByDimension.get(dimension.key) ??
        ({
          label: dimension.label,
          totals: Array.from({ length: months.length }).map(() => 0),
          total: 0,
        } as const);
      const value = toNumber(exit.quantity);
      const nextTotals = [...current.totals];
      nextTotals[idx] += value;
      totalsByDimension.set(dimension.key, {
        label: dimension.label,
        totals: nextTotals,
        total: current.total + value,
      });
    });

    const series = Array.from(totalsByDimension.entries())
      .map(([key, value]) => ({ key, ...value }))
      .sort((a, b) => b.total - a.total)
      .slice(0, query.itemId || query.group ? 1 : 8)
      .map(({ key, label, totals }) => ({ key, label, totals }));

    return {
      view,
      from: fromDate,
      to: toDate,
      months: months.map((m) => ({ key: m.key, label: m.label })),
      series,
    };
  }

  async getFlow(
    tenantId: string,
    query: {
      from?: string;
      to?: string;
      view?: 'item' | 'group';
      itemId?: string;
      group?: string;
      type?: 'ATTENDED' | 'DONATION' | 'EVENT' | 'PARTY' | 'CORRECTION';
      eventName?: string;
    },
  ) {
    const view = query.view ?? 'item';
    const eventName = normalizeString(query.eventName);

    const now = new Date();
    const fromDate =
      parseDateInput(query.from) ?? new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const toDate = parseDateInput(query.to, { endOfDay: true }) ?? now;

    const itemFilter = query.itemId ? { itemId: query.itemId } : {};
    const groupFilter =
      view === 'group' && query.group ? { item: { group: query.group } } : {};

    const [entries, exits] = await this.prisma.$transaction([
      this.prisma.pantryEntry.findMany({
        where: {
          tenantId,
          entryDate: { gte: fromDate, lte: toDate },
          ...itemFilter,
          ...groupFilter,
        },
        select: { entryDate: true, quantity: true },
      }),
      this.prisma.pantryExit.findMany({
        where: {
          tenantId,
          exitDate: { gte: fromDate, lte: toDate },
          ...itemFilter,
          ...groupFilter,
          ...(query.type ? { type: query.type } : { type: { not: 'CORRECTION' } }),
          ...(eventName ? { eventName: { contains: eventName } } : {}),
        },
        select: { exitDate: true, quantity: true },
      }),
    ]);

    const months: { key: string; label: string; start: Date }[] = [];
    const startMonth = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
    const endMonth = new Date(toDate.getFullYear(), toDate.getMonth(), 1);
    for (
      let cursor = new Date(startMonth);
      cursor <= endMonth;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    ) {
      months.push({
        key: resolveMonthKey(cursor),
        label: resolveMonthLabel(cursor),
        start: cursor,
      });
    }

    const monthIndex = new Map(months.map((m, idx) => [m.key, idx]));
    const entriesTotals = Array.from({ length: months.length }).map(() => 0);
    const exitsTotals = Array.from({ length: months.length }).map(() => 0);

    entries.forEach((entry) => {
      const idx = monthIndex.get(resolveMonthKey(entry.entryDate));
      if (idx === undefined) return;
      entriesTotals[idx] += toNumber(entry.quantity);
    });

    exits.forEach((exit) => {
      const idx = monthIndex.get(resolveMonthKey(exit.exitDate));
      if (idx === undefined) return;
      exitsTotals[idx] += toNumber(exit.quantity);
    });

    return {
      view,
      from: fromDate,
      to: toDate,
      months: months.map((m) => ({ key: m.key, label: m.label })),
      entries: entriesTotals,
      exits: exitsTotals,
    };
  }

  async getUsage(
    tenantId: string,
    query: {
      from?: string;
      to?: string;
      view?: 'item' | 'group';
      itemId?: string;
      group?: string;
      type?: 'ATTENDED' | 'DONATION' | 'EVENT' | 'PARTY' | 'CORRECTION';
      eventName?: string;
    },
  ) {
    const view = query.view ?? 'item';
    const eventName = normalizeString(query.eventName);

    const now = new Date();
    const fromDate =
      parseDateInput(query.from) ?? new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const toDate = parseDateInput(query.to, { endOfDay: true }) ?? now;

    const itemFilter = query.itemId ? { itemId: query.itemId } : {};
    const groupFilter =
      view === 'group' && query.group ? { item: { group: query.group } } : {};

    const grouped = await this.prisma.pantryExit.groupBy({
      by: ['type'],
      where: {
        tenantId,
        exitDate: { gte: fromDate, lte: toDate },
        ...itemFilter,
        ...groupFilter,
        ...(query.type ? { type: query.type } : { type: { not: 'CORRECTION' } }),
        ...(eventName ? { eventName: { contains: eventName } } : {}),
      },
      _sum: { quantity: true },
    });

    const totals = grouped
      .map((row) => ({
        type: row.type,
        label: resolveExitTypeLabel(row.type),
        total: toNumber(row._sum?.quantity),
      }))
      .sort((a, b) => b.total - a.total);

    return {
      view,
      from: fromDate,
      to: toDate,
      totals,
    };
  }

  async reverseEntry(
    tenantId: string,
    entryId: string,
    dto: ReversePantryMovementDto,
  ) {
    const entry = await this.prisma.pantryEntry.findFirst({
      where: { tenantId, id: entryId },
      include: { item: true },
    });

    if (!entry) {
      throw new NotFoundException('Entrada/lote nao encontrado.');
    }

    const reversed = await this.prisma.pantryExit.findFirst({
      where: { tenantId, reversalOfEntryId: entryId },
      select: { id: true },
    });

    if (reversed) {
      throw new BadRequestException('Esta entrada ja foi estornada.');
    }

    const allocated = await this.prisma.pantryExitAllocation.aggregate({
      where: { tenantId, entryId },
      _sum: { quantity: true },
    });

    const allocatedTotal = toNumber(allocated._sum?.quantity);
    if (allocatedTotal > 0) {
      throw new BadRequestException(
        'Nao e possivel estornar uma entrada que ja teve saidas vinculadas. Ajuste as saidas primeiro.',
      );
    }

    const exitDate = parseDateInput(dto.date) ?? new Date();
    const notes =
      normalizeString(dto.notes) ?? `Estorno da entrada ${entryId} (Correcao).`;

    return this.prisma.$transaction(async (trx) => {
      const exit = await trx.pantryExit.create({
        data: {
          tenantId,
          itemId: entry.itemId,
          sector: normalizeSector(entry.sector),
          quantity: entry.quantity,
          unit: entry.unit,
          exitDate,
          type: 'CORRECTION',
          notes,
          reversalOfEntryId: entryId,
        },
        include: { item: true },
      });

      await trx.pantryExitAllocation.create({
        data: {
          tenantId,
          exitId: exit.id,
          entryId: entry.id,
          quantity: entry.quantity,
        },
      });

      return exit;
    });
  }

  async reverseExit(
    tenantId: string,
    exitId: string,
    dto: ReversePantryMovementDto,
  ) {
    const exit = await this.prisma.pantryExit.findFirst({
      where: { tenantId, id: exitId },
      include: { item: true },
    });

    if (!exit) {
      throw new NotFoundException('Saida nao encontrada.');
    }

    const existing = await this.prisma.pantryEntry.findFirst({
      where: { tenantId, reversalOfExitId: exitId },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('Esta saida ja foi estornada.');
    }

    const entryDate = parseDateInput(dto.date) ?? new Date();
    const notes =
      normalizeString(dto.notes) ?? `Estorno da saida ${exitId} (Correcao).`;

    return this.prisma.$transaction(async (trx) => {
      const allocations = await trx.pantryExitAllocation.findMany({
        where: { tenantId, exitId },
        include: {
          entry: { select: { sector: true, expiryDate: true } },
        },
      });

      const groups = new Map<string, { sector: string; expiry: Date | null; qty: number }>();

      if (!allocations.length) {
        const key = `${normalizeSector(exit.sector)}::`;
        groups.set(key, {
          sector: normalizeSector(exit.sector),
          expiry: null,
          qty: toNumber(exit.quantity),
        });
      } else {
        allocations.forEach((allocation) => {
          const sector = normalizeSector(allocation.entry.sector);
          const expiry = allocation.entry.expiryDate ?? null;
          const expiryKey = expiry ? expiry.toISOString() : '';
          const key = `${sector}::${expiryKey}`;
          const current = groups.get(key);
          const qty = toNumber(allocation.quantity);
          groups.set(key, {
            sector,
            expiry,
            qty: (current?.qty ?? 0) + qty,
          });
        });
      }

      const created = await Promise.all(
        Array.from(groups.values()).map((group) =>
          trx.pantryEntry.create({
            data: {
              tenantId,
              itemId: exit.itemId,
              donorId: null,
              sector: group.sector,
              quantity: group.qty,
              unit: exit.unit,
              entryDate,
              expiryDate: group.expiry,
              notes,
              reversalOfExitId: exitId,
            },
            include: { item: true, donor: true },
          }),
        ),
      );

      return {
        ok: true,
        exitId,
        createdEntries: created,
      };
    });
  }

  private async enrichItems(tenantId: string, items: Prisma.PantryItemGetPayload<{}>[]) {
    if (!items.length) return [];

    const itemIds = items.map((item) => item.id);

    const [entryGroups, exitGroups, entriesWithExpiry] = await this.prisma.$transaction([
      this.prisma.pantryEntry.groupBy({
        by: ['itemId'],
        where: { tenantId, itemId: { in: itemIds } },
        orderBy: { itemId: 'asc' },
        _sum: { quantity: true },
        _max: { entryDate: true },
      }),
      this.prisma.pantryExit.groupBy({
        by: ['itemId'],
        where: { tenantId, itemId: { in: itemIds } },
        orderBy: { itemId: 'asc' },
        _sum: { quantity: true },
        _max: { exitDate: true },
      }),
      this.prisma.pantryEntry.findMany({
        where: { tenantId, itemId: { in: itemIds }, expiryDate: { not: null } },
        select: { id: true, itemId: true, sector: true, expiryDate: true, quantity: true },
      }),
    ]);

    const entryMap = new Map<string, { total: number; last: Date | null }>();
    entryGroups.forEach((entry) => {
      entryMap.set(entry.itemId, {
        total: toNumber(entry._sum?.quantity),
        last: entry._max?.entryDate ?? null,
      });
    });

    const exitMap = new Map<string, { total: number; last: Date | null }>();
    exitGroups.forEach((exit) => {
      exitMap.set(exit.itemId, {
        total: toNumber(exit._sum?.quantity),
        last: exit._max?.exitDate ?? null,
      });
    });

    const expiryMap = new Map<string, Date | null>();
    if (entriesWithExpiry.length) {
      const allocationMap = await this.sumExitAllocationsByEntry(
        tenantId,
        entriesWithExpiry.map((entry) => entry.id),
      );
      const { byItem } = this.resolveOpenEntryExpiryMaps(
        entriesWithExpiry,
        allocationMap,
      );
      byItem.forEach((value, itemId) => {
        expiryMap.set(itemId, value.date);
      });
    }

    return items.map((item) => {
      const entryStats = entryMap.get(item.id);
      const exitStats = exitMap.get(item.id);
      const entriesTotal = entryStats?.total ?? 0;
      const exitsTotal = exitStats?.total ?? 0;
      const stock = entriesTotal - exitsTotal;
      const nextExpiryDate = expiryMap.get(item.id) ?? null;
      const lastEntryDate = entryStats?.last ?? null;
      const lastExitDate = exitStats?.last ?? null;
      const lastMovementDate =
        lastEntryDate && lastExitDate
          ? lastEntryDate > lastExitDate
            ? lastEntryDate
            : lastExitDate
          : lastEntryDate ?? lastExitDate ?? null;
      const validityStatus = resolveValidityStatus(nextExpiryDate);
      const minStock = toNumber(item.minStock);

      return {
        id: item.id,
        tenantId: item.tenantId,
        name: item.name,
        group: item.group,
        defaultSector: normalizeSector(item.defaultSector),
        unit: item.unit,
        minStock,
        notes: item.notes ?? null,
        tags: parseTags((item as { tags?: string | null }).tags ?? null),
        internalNotes: (item as { internalNotes?: string | null }).internalNotes ?? null,
        stock,
        entriesTotal,
        exitsTotal,
        lastEntryDate,
        lastExitDate,
        lastMovementDate,
        nextExpiryDate,
        validityStatus,
        daysToExpire: resolveDaysToExpire(nextExpiryDate),
        isBelowMin: stock < minStock,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });
  }

  private async assertItem(tenantId: string, itemId: string) {
    const item = await this.prisma.pantryItem.findFirst({
      where: { id: itemId, tenantId },
    });
    if (!item) {
      throw new NotFoundException('Item nao encontrado');
    }
    return item;
  }

  private async assertDonor(tenantId: string, donorId: string) {
    const donor = await this.prisma.pantryDonor.findFirst({
      where: { id: donorId, tenantId },
    });
    if (!donor) {
      throw new NotFoundException('Doador nao encontrado');
    }
    return donor;
  }
}
