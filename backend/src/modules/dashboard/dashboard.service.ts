import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma';
import { PrismaService } from '../../core/prisma/prisma.service';
import { parseDateInput } from '../../core/utils/dates';

type OverviewParams = {
  from?: string;
  to?: string;
};

function buildDateRange(params: OverviewParams) {
  const parsedTo = parseDateInput(params.to, { endOfDay: true }) ?? new Date();
  const parsedFrom =
    parseDateInput(params.from) ??
    new Date(parsedTo.getTime() - 30 * 24 * 60 * 60 * 1000);

  if (parsedFrom.getTime() > parsedTo.getTime()) {
    throw new BadRequestException('Periodo invalido: inicio maior que termino');
  }

  const maxDays = 740;
  const diffDays = Math.ceil(
    (parsedTo.getTime() - parsedFrom.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays > maxDays) {
    throw new BadRequestException(
      `Periodo muito longo. Selecione no maximo ${maxDays} dias.`,
    );
  }

  return { from: parsedFrom, to: parsedTo };
}

function buildActionExecutedPeriodWhere(params: {
  from: Date;
  to: Date;
}): Prisma.ProjectActionWhereInput {
  const { from, to } = params;
  return {
    status: 'EXECUTED',
    OR: [
      { executedStartAt: { gte: from, lte: to } },
      { executedStartAt: null, executedEndAt: { gte: from, lte: to } },
      {
        executedStartAt: null,
        executedEndAt: null,
        updatedAt: { gte: from, lte: to },
      },
    ],
  };
}

function toMonthKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function listMonthKeys(from: Date, to: Date) {
  const items: string[] = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));
  while (cursor.getTime() <= end.getTime()) {
    items.push(toMonthKey(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return items;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(tenantId: string, params: OverviewParams) {
    const range = buildDateRange(params);
    const actionPeriodWhere = buildActionExecutedPeriodWhere(range);

    const [
      attendedActive,
      familyActive,
      attendedWaiting,
      genderRows,
      raceRows,
      executedActions,
      attendanceByAction,
      actionsByTypeRows,
      recentActivities,
    ] = await Promise.all([
      this.prisma.person.count({
        where: { tenantId, personType: 'Atendido', status: 'Ativo' },
      }),
      this.prisma.person.count({
        where: { tenantId, personType: 'Familiar', status: 'Ativo' },
      }),
      this.prisma.person.count({
        where: {
          tenantId,
          personType: 'Atendido',
          status: { in: ['Em espera', 'Em analise', 'Em análise'] },
        },
      }),
      this.prisma.person.groupBy({
        by: ['gender'],
        where: { tenantId, personType: 'Atendido', status: 'Ativo' },
        _count: { _all: true },
      }),
      this.prisma.person.groupBy({
        by: ['raceColor'],
        where: { tenantId, personType: 'Atendido', status: 'Ativo' },
        _count: { _all: true },
      }),
      this.prisma.projectAction.findMany({
        where: { tenantId, ...actionPeriodWhere },
        select: {
          id: true,
          actionTypeId: true,
          executedStartAt: true,
          executedEndAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.projectActionAttendance.groupBy({
        by: ['actionId'],
        where: {
          tenantId,
          status: 'PRESENT',
          action: { tenantId, ...actionPeriodWhere },
        },
        _count: { _all: true },
      }),
      this.prisma.projectAction.groupBy({
        by: ['actionTypeId'],
        where: { tenantId, ...actionPeriodWhere },
        _count: { _all: true },
      }),
      this.prisma.auditLog.findMany({
        where: {
          tenantId,
          createdAt: { gte: range.from, lte: range.to },
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 8,
        select: {
          id: true,
          action: true,
          entity: true,
          entityId: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    const gender = genderRows
      .map((row) => ({
        key: row.gender ?? 'Nao informado',
        total: row._count._all,
      }))
      .sort((a, b) => b.total - a.total);

    const raceColor = raceRows
      .map((row) => ({
        key: row.raceColor ?? 'Prefiro nao informar',
        total: row._count._all,
      }))
      .sort((a, b) => b.total - a.total);

    const actionMonthById = new Map<string, string>();
    const actionsPerMonth = new Map<string, number>();
    executedActions.forEach((action) => {
      const date =
        action.executedStartAt ?? action.executedEndAt ?? action.updatedAt;
      const key = toMonthKey(date);
      actionMonthById.set(action.id, key);
      actionsPerMonth.set(key, (actionsPerMonth.get(key) ?? 0) + 1);
    });

    const attendancesPerMonth = new Map<string, number>();
    attendanceByAction.forEach((row) => {
      const month = actionMonthById.get(row.actionId);
      if (!month) return;
      attendancesPerMonth.set(
        month,
        (attendancesPerMonth.get(month) ?? 0) + row._count._all,
      );
    });

    const months = listMonthKeys(range.from, range.to);
    const series = months.map((month) => ({
      month,
      actionsExecuted: actionsPerMonth.get(month) ?? 0,
      attendances: attendancesPerMonth.get(month) ?? 0,
    }));

    const actionTypeIds = actionsByTypeRows
      .map((row) => row.actionTypeId)
      .filter(Boolean);
    const actionTypes = actionTypeIds.length
      ? await this.prisma.actionType.findMany({
          where: { tenantId, id: { in: actionTypeIds } },
          select: { id: true, name: true },
        })
      : [];
    const actionTypeNameById = new Map(actionTypes.map((t) => [t.id, t.name]));

    const actionsByType = actionsByTypeRows
      .map((row) => ({
        actionTypeId: row.actionTypeId,
        name: actionTypeNameById.get(row.actionTypeId) ?? 'Sem tipo',
        total: row._count._all,
      }))
      .sort((a, b) => b.total - a.total);

    return {
      people: {
        attendedActive,
        familyActive,
        attendedWaiting,
      },
      socialAnalysis: {
        base: { personType: 'Atendido', status: 'Ativo' as const },
        gender,
        raceColor,
      },
      period: {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      },
      totals: {
        attendances: attendanceByAction.reduce((acc, row) => acc + row._count._all, 0),
        actionsExecuted: executedActions.length,
      },
      series,
      actionsByType,
      recentActivities: recentActivities.map((item) => ({
        id: item.id,
        action: item.action,
        entity: item.entity,
        entityId: item.entityId,
        createdAt: item.createdAt,
        user: item.user
          ? { id: item.user.id, name: item.user.name, email: item.user.email }
          : null,
      })),
    };
  }
}
