import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, type AuditLogAction } from '../../generated/prisma';
import { RequestContextService } from '../request-context/request-context.service';
import { createPrismaAdapter } from './prisma-adapter';

const AUDIT_ACTIONS = new Set([
  'create',
  'update',
  'delete',
  'upsert',
  'createMany',
  'updateMany',
  'deleteMany',
]);
const AUDIT_IGNORED_MODELS = new Set([
  'AuditLog',
  'AccessLog',
  'PersonSensitiveAccessLog',
]);
const BULK_AUDIT_LIMIT = 50;

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'cpf',
  'document',
  'rg',
  'nis',
  'cns',
  'dataenc',
  'iv',
  'tag',
  'token',
  'tokenhash',
  'refreshtoken',
  'accesstoken',
  'secret',
]);
const SENSITIVE_KEYWORDS = ['password', 'token', 'secret'];

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    config: ConfigService,
    private readonly requestContext: RequestContextService,
  ) {
    const databaseUrl = config.get<string>('DATABASE_URL');
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not set');
    }

    const adapter = createPrismaAdapter(databaseUrl);

    super({ adapter });

    this.applyAuditExtension();
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  private applyAuditExtension() {
    const extension = {
      query: {
        $allModels: {
          $allOperations: async ({
            model,
            operation,
            args,
            query,
          }: {
            model?: string;
            operation: string;
            args: any;
            query: (args: any) => Promise<any>;
          }) => this.handleAuditOperation(model, operation, args, query),
        },
      },
    };

    const extensions = (this as any)._extensions;
    if (extensions?.append) {
      (this as any)._extensions = extensions.append(extension);
      return;
    }

    const extender = (this as any).$extends;
    if (typeof extender === 'function') {
      const extended = extender.call(this, extension);
      if (extended?._extensions) {
        (this as any)._extensions = extended._extensions;
      }
    }
  }

  private async handleAuditOperation(
    model: string | undefined,
    operation: string,
    args: any,
    query: (args: any) => Promise<any>,
  ) {
    if (!this.shouldAudit(model, operation)) {
      return query(args);
    }

    const action = operation;
    const entity = model ?? 'Unknown';
    const where = args?.where;

    if (action === 'create') {
      const result = await query(args);
      await this.safeAuditLog({
        action: 'CREATE',
        entity,
        entityId: this.extractEntityId(result),
        before: null,
        after: result,
      });
      return result;
    }

    if (action === 'update') {
      const before = await this.fetchBefore(entity, where);
      const result = await query(args);
      const after = await this.ensureAfter(entity, result, before);
      await this.safeAuditLog({
        action: 'UPDATE',
        entity,
        entityId: this.extractEntityId(after) ?? this.extractEntityId(before),
        before,
        after,
      });
      return result;
    }

    if (action === 'delete') {
      const before = await this.fetchBefore(entity, where);
      const result = await query(args);
      await this.safeAuditLog({
        action: 'DELETE',
        entity,
        entityId: this.extractEntityId(before) ?? this.extractEntityId(result),
        before,
        after: null,
      });
      return result;
    }

    if (action === 'upsert') {
      const before = await this.fetchBefore(entity, where);
      const result = await query(args);
      const after = await this.ensureAfter(entity, result, before);
      const auditAction: AuditLogAction = before ? 'UPDATE' : 'CREATE';
      await this.safeAuditLog({
        action: auditAction,
        entity,
        entityId: this.extractEntityId(after) ?? this.extractEntityId(before),
        before,
        after,
      });
      return result;
    }

    if (action === 'updateMany') {
      const beforeItems = await this.fetchMany(entity, where, BULK_AUDIT_LIMIT);
      const result = await query(args);
      await this.auditBulkUpdate(entity, beforeItems, result?.count);
      return result;
    }

    if (action === 'deleteMany') {
      const beforeItems = await this.fetchMany(entity, where, BULK_AUDIT_LIMIT);
      const result = await query(args);
      await this.auditBulkDelete(entity, beforeItems, result?.count, where);
      return result;
    }

    if (action === 'createMany') {
      const result = await query(args);
      await this.auditBulkCreate(entity, args?.data, result?.count);
      return result;
    }

    return query(args);
  }

  private shouldAudit(model?: string, operation?: string) {
    if (!model) return false;
    if (AUDIT_IGNORED_MODELS.has(model)) return false;
    if (!operation) return false;
    return AUDIT_ACTIONS.has(operation);
  }

  private getDelegate(model: string) {
    if (!model) return null;
    const key = model.charAt(0).toLowerCase() + model.slice(1);
    const delegate = (this as any)[key];
    if (!delegate) return null;
    return delegate;
  }

  private async fetchBefore(model: string, where: any) {
    if (!where) return null;
    const delegate = this.getDelegate(model);
    if (!delegate?.findFirst) return null;
    try {
      return await delegate.findFirst({ where });
    } catch (error) {
      return null;
    }
  }

  private async fetchMany(model: string, where: any, limit: number) {
    const delegate = this.getDelegate(model);
    if (!delegate?.findMany) return [];
    try {
      return await delegate.findMany({ where, take: limit });
    } catch (error) {
      return [];
    }
  }

  private async ensureAfter(model: string, result: any, before: any) {
    if (result && typeof result === 'object' && 'tenantId' in result) {
      return result;
    }

    const id = this.extractEntityId(result) ?? this.extractEntityId(before);
    if (!id) return result;

    const delegate = this.getDelegate(model);
    if (!delegate?.findUnique) return result;

    try {
      return await delegate.findUnique({ where: { id } });
    } catch (error) {
      return result;
    }
  }

  private extractEntityId(record: any) {
    if (!record || typeof record !== 'object') return null;
    if ('id' in record && typeof record.id === 'string') {
      return record.id;
    }
    return null;
  }

  private resolveTenantId(...candidates: Array<any>) {
    for (const candidate of candidates) {
      if (!candidate) continue;
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate;
      }
      if (
        typeof candidate === 'object' &&
        'tenantId' in candidate &&
        typeof candidate.tenantId === 'string'
      ) {
        return candidate.tenantId;
      }
    }
    return null;
  }

  private redact(value: any): any {
    if (typeof value === 'function') {
      return `[Function${value.name ? `: ${value.name}` : ''}]`;
    }

    if (value === undefined) {
      return null;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (value && typeof value === 'object') {
      if (typeof (value as any).toJSON === 'function') {
        const jsonValue = (value as any).toJSON();
        if (
          jsonValue === null ||
          typeof jsonValue === 'string' ||
          typeof jsonValue === 'number' ||
          typeof jsonValue === 'boolean'
        ) {
          return jsonValue;
        }
      }

      const constructorName =
        'constructor' in value && value.constructor
          ? value.constructor.name
          : undefined;
      if (
        constructorName === 'Decimal' &&
        typeof value.toString === 'function'
      ) {
        return value.toString();
      }
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.redact(item));
    }

    if (value && typeof value === 'object') {
      const output: Record<string, any> = {};
      for (const [key, fieldValue] of Object.entries(value)) {
        if (key === 'constructor' && typeof fieldValue === 'function') {
          continue;
        }
        const lowerKey = key.toLowerCase();
        const shouldRedact =
          SENSITIVE_KEYS.has(lowerKey) ||
          SENSITIVE_KEYWORDS.some((keyword) => lowerKey.includes(keyword));
        output[key] = shouldRedact ? '[REDACTED]' : this.redact(fieldValue);
      }
      return output;
    }

    return value;
  }

  private toAuditJson(value: any) {
    const redacted = this.redact(value);
    try {
      return JSON.parse(JSON.stringify(redacted));
    } catch {
      return redacted;
    }
  }

  private async safeAuditLog(entry: {
    action: AuditLogAction;
    entity: string;
    entityId?: string | null;
    before?: any;
    after?: any;
    meta?: { tenantId?: string | null; userId?: string | null };
  }) {
    try {
      const context = this.requestContext.get();
      if (context?.disableAudit) return;
      const tenantId =
        this.resolveTenantId(
          entry.after,
          entry.before,
          context?.tenantId ?? null,
        ) ?? null;
      if (!tenantId) return;

      await this.auditLog.create({
        data: {
          tenantId,
          userId: entry.meta?.userId ?? context?.userId ?? null,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId ?? null,
          before: entry.before ? this.toAuditJson(entry.before) : null,
          after: entry.after ? this.toAuditJson(entry.after) : null,
          ipAddress: context?.ipAddress ?? null,
          userAgent: context?.userAgent ?? null,
          requestId: context?.requestId ?? null,
        },
      });
    } catch (error) {
      console.warn('AuditLog failed', error);
    }
  }

  private async auditBulkUpdate(
    entity: string,
    beforeItems: any[],
    updatedCount?: number,
  ) {
    const limit = beforeItems.length;
    for (const item of beforeItems) {
      const after = await this.ensureAfter(entity, { id: item?.id }, item);
      await this.safeAuditLog({
        action: 'UPDATE',
        entity,
        entityId: this.extractEntityId(item),
        before: item,
        after,
      });
    }

    if (updatedCount && updatedCount > limit) {
      await this.safeAuditLog({
        action: 'UPDATE',
        entity,
        entityId: null,
        before: { count: updatedCount, truncated: true },
        after: { count: updatedCount, truncated: true },
      });
    }
  }

  private async auditBulkDelete(
    entity: string,
    beforeItems: any[],
    deletedCount?: number,
    where?: any,
  ) {
    const limit = beforeItems.length;
    for (const item of beforeItems) {
      await this.safeAuditLog({
        action: 'DELETE',
        entity,
        entityId: this.extractEntityId(item),
        before: item,
        after: null,
      });
    }

    if (deletedCount && deletedCount > limit) {
      await this.safeAuditLog({
        action: 'DELETE',
        entity,
        entityId: null,
        before: { count: deletedCount, truncated: true, where },
        after: null,
      });
    }
  }

  private async auditBulkCreate(entity: string, data: any, count?: number) {
    if (!data && !count) return;

    const items = Array.isArray(data)
      ? data.slice(0, BULK_AUDIT_LIMIT)
      : data
        ? [data]
        : [];
    const truncated = Array.isArray(data) && data.length > BULK_AUDIT_LIMIT;

    await this.safeAuditLog({
      action: 'CREATE',
      entity,
      entityId: null,
      before: null,
      after: {
        count: count ?? items.length,
        truncated,
        sample: items,
      },
    });
  }
}
