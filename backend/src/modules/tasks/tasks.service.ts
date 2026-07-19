import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  Prisma,
  TaskOrganizerKind,
  TaskOrganizerPriority,
  TaskOrganizerStatus,
} from '../../generated/prisma';
import { PrismaService } from '../../core/prisma/prisma.service';
import { parseDateInput } from '../../core/utils/dates';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../core/utils/pagination';
import { normalizeString } from '../../core/utils/strings';
import { CreateTaskChecklistItemDto } from './dto/create-task-checklist-item.dto';
import { CreateTaskAttachmentDto } from './dto/create-task-attachment.dto';
import { CreateTaskCommentDto } from './dto/create-task-comment.dto';
import { CreateTaskDependencyDto } from './dto/create-task-dependency.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { CreateTaskSubtaskDto } from './dto/create-task-subtask.dto';
import { ListTasksQueryDto } from './dto/list-tasks-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskChecklistItemDto } from './dto/update-task-checklist-item.dto';
import { UpdateTaskSubtaskDto } from './dto/update-task-subtask.dto';
import {
  applyTaskFilters,
  applyTaskSearch,
  parseAdvancedFilters,
  parseGrouping,
  sortTaskRows,
} from './tasks.filters';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 1000;

const TASK_STATUS_TO_DB: Record<string, TaskOrganizerStatus> = {
  Backlog: 'BACKLOG',
  'Em andamento': 'IN_PROGRESS',
  'Em revisao': 'IN_REVIEW',
  Concluida: 'DONE',
  Bloqueada: 'BLOCKED',
};

const TASK_STATUS_FROM_DB: Record<TaskOrganizerStatus, string> = {
  BACKLOG: 'Backlog',
  IN_PROGRESS: 'Em andamento',
  IN_REVIEW: 'Em revisao',
  DONE: 'Concluida',
  BLOCKED: 'Bloqueada',
};

const TASK_PRIORITY_TO_DB: Record<string, TaskOrganizerPriority> = {
  Baixa: 'LOW',
  Media: 'MEDIUM',
  Alta: 'HIGH',
  Critica: 'CRITICAL',
};

const TASK_PRIORITY_FROM_DB: Record<TaskOrganizerPriority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Critica',
};

const TASK_KIND_TO_DB: Record<string, TaskOrganizerKind> = {
  Feature: 'FEATURE',
  Bug: 'BUG',
  Rotina: 'ROUTINE',
};

const TASK_KIND_FROM_DB: Record<TaskOrganizerKind, string> = {
  FEATURE: 'Feature',
  BUG: 'Bug',
  ROUTINE: 'Rotina',
};

const TASK_WITH_RELATIONS = {
  ownerUser: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      isActive: true,
    },
  },
} satisfies Prisma.TaskOrganizerTaskInclude;

const TASK_LIST_WITH_RELATIONS = {
  ownerUser: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      isActive: true,
    },
  },
  blockedByDependencies: {
    select: {
      id: true,
      dependsOnTaskId: true,
    },
  },
  subtasks: {
    orderBy: { sortOrder: 'asc' },
    include: {
      ownerUser: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          isActive: true,
        },
      },
    },
  },
} satisfies Prisma.TaskOrganizerTaskInclude;

const TASK_DETAIL_WITH_RELATIONS = {
  ownerUser: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarUrl: true,
      isActive: true,
    },
  },
  checklistItems: {
    orderBy: { sortOrder: 'asc' },
    include: {
      ownerUser: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          isActive: true,
        },
      },
    },
  },
  subtasks: {
    orderBy: { sortOrder: 'asc' },
    include: {
      ownerUser: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
          isActive: true,
        },
      },
    },
  },
  comments: {
    orderBy: { createdAt: 'desc' },
    include: {
      authorUser: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  },
  attachments: {
    orderBy: { createdAt: 'desc' },
    include: {
      uploadedByUser: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  },
  blockedByDependencies: {
    include: {
      dependsOnTask: {
        include: {
          ownerUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  },
  dependentTaskLinks: {
    include: {
      task: {
        include: {
          ownerUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.TaskOrganizerTaskInclude;

type TaskEntity = Prisma.TaskOrganizerTaskGetPayload<{
  include: typeof TASK_WITH_RELATIONS;
}>;

type TaskListEntity = Prisma.TaskOrganizerTaskGetPayload<{
  include: typeof TASK_LIST_WITH_RELATIONS;
}>;

type TaskDetailEntity = Prisma.TaskOrganizerTaskGetPayload<{
  include: typeof TASK_DETAIL_WITH_RELATIONS;
}>;

const toDateOnly = (value?: Date | null) =>
  value ? value.toISOString().slice(0, 10) : null;

const toIsoString = (value: Date) => value.toISOString();

const normalizeTags = (tags?: string[] | null) =>
  Array.from(new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean)));

const parseTags = (value: Prisma.JsonValue | null | undefined) => {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry ?? '').trim()).filter(Boolean);
};

const parseMentionUserIds = (value: Prisma.JsonValue | null | undefined) => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((entry) => String(entry ?? '').trim())
        .filter(Boolean),
    ),
  );
};

const resolveOwnerLabel = (task: {
  owner?: string | null;
  ownerUser?: { name?: string | null; email?: string | null } | null;
}) => task.ownerUser?.name?.trim() || task.ownerUser?.email?.trim() || task.owner || null;

const resolveDueMetrics = (task: {
  dueDate?: Date | null;
  status?: TaskOrganizerStatus;
}) => {
  if (!task.dueDate) {
    return { dueState: 'Sem prazo', isOverdue: false, daysUntilDue: null };
  }

  if (task.status === 'DONE') {
    return { dueState: 'Concluida', isOverdue: false, daysUntilDue: 0 };
  }

  const today = new Date();
  const todayOnly = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const dueOnly = new Date(
    Date.UTC(task.dueDate.getUTCFullYear(), task.dueDate.getUTCMonth(), task.dueDate.getUTCDate()),
  );
  const diff = Math.round((dueOnly.getTime() - todayOnly.getTime()) / 86400000);

  if (diff < 0) {
    return { dueState: 'Atrasada', isOverdue: true, daysUntilDue: diff };
  }

  if (diff === 0) {
    return { dueState: 'Hoje', isOverdue: false, daysUntilDue: 0 };
  }

  if (diff <= 3) {
    return { dueState: 'Proxima', isOverdue: false, daysUntilDue: diff };
  }

  return { dueState: 'Planejada', isOverdue: false, daysUntilDue: diff };
};

const mapChecklistItem = (
  item: TaskDetailEntity['checklistItems'][number],
) => ({
  id: item.id,
  label: item.label,
  done: item.done,
  owner: resolveOwnerLabel(item),
  ownerUserId: item.ownerUserId,
  dueDate: toDateOnly(item.dueDate),
  notes: item.notes,
  createdAt: toIsoString(item.createdAt),
  updatedAt: toIsoString(item.updatedAt),
});

const mapSubtask = (
  item: TaskDetailEntity['subtasks'][number],
) => ({
  id: item.id,
  title: item.title,
  status: TASK_STATUS_FROM_DB[item.status],
  owner: resolveOwnerLabel(item),
  ownerUserId: item.ownerUserId,
  startDate: toDateOnly(item.startDate),
  dueDate: toDateOnly(item.dueDate),
  description: item.description,
  createdAt: toIsoString(item.createdAt),
  updatedAt: toIsoString(item.updatedAt),
});

const mapTaskListRecord = (task: TaskListEntity) => {
  const dueMetrics = resolveDueMetrics(task);

  return {
    id: task.id,
    title: task.title,
    summary: task.summary,
    description: task.description,
    status: TASK_STATUS_FROM_DB[task.status],
    priority: TASK_PRIORITY_FROM_DB[task.priority],
    kind: TASK_KIND_FROM_DB[task.kind],
    owner: resolveOwnerLabel(task),
    ownerUserId: task.ownerUserId,
    team: task.team,
    startDate: toDateOnly(task.startDate),
    dueDate: toDateOnly(task.dueDate),
    progress: task.progress,
    isMilestone: task.isMilestone,
    effortPoints: task.effortPoints,
    tags: parseTags(task.tags),
    internalNotes: task.internalNotes,
    dueState: dueMetrics.dueState,
    isOverdue: dueMetrics.isOverdue,
    daysUntilDue: dueMetrics.daysUntilDue,
    checklist: [],
    subtasks: task.subtasks?.map(mapSubtask) ?? [],
    comments: [],
    attachments: [],
    dependencies:
      task.blockedByDependencies?.map((entry) => ({
        id: entry.id,
        direction: 'blocked_by',
        taskId: entry.dependsOnTaskId,
        title: '',
        status: 'Backlog',
        priority: 'Media',
        owner: null,
        ownerUserId: null,
        dueDate: null,
      })) ?? [],
    dependents: [],
    createdAt: toIsoString(task.createdAt),
    updatedAt: toIsoString(task.updatedAt),
  };
};

const mapTaskRecord = (task: TaskEntity | TaskDetailEntity) => {
  const detailTask = task as Partial<TaskDetailEntity>;
  const dueMetrics = resolveDueMetrics(task);

  return {
    id: task.id,
    title: task.title,
    summary: task.summary,
    description: task.description,
    status: TASK_STATUS_FROM_DB[task.status],
    priority: TASK_PRIORITY_FROM_DB[task.priority],
    kind: TASK_KIND_FROM_DB[task.kind],
    owner: resolveOwnerLabel(task),
    ownerUserId: task.ownerUserId,
    team: task.team,
    startDate: toDateOnly(task.startDate),
    dueDate: toDateOnly(task.dueDate),
    progress: task.progress,
    isMilestone: task.isMilestone,
    effortPoints: task.effortPoints,
    tags: parseTags(task.tags),
    internalNotes: task.internalNotes,
    dueState: dueMetrics.dueState,
    isOverdue: dueMetrics.isOverdue,
    daysUntilDue: dueMetrics.daysUntilDue,
    checklist: detailTask.checklistItems?.map(mapChecklistItem) ?? [],
    subtasks: detailTask.subtasks?.map(mapSubtask) ?? [],
    comments:
      detailTask.comments?.map((comment) => ({
        id: comment.id,
        body: comment.body,
        mentionUserIds: parseMentionUserIds(comment.mentionUserIds),
        author: {
          id: comment.authorUser?.id ?? null,
          name:
            comment.authorUser?.name?.trim() ||
            comment.authorUser?.email ||
            'Equipe interna',
          email: comment.authorUser?.email ?? null,
          avatarUrl: comment.authorUser?.avatarUrl ?? null,
        },
        createdAt: toIsoString(comment.createdAt),
        updatedAt: toIsoString(comment.updatedAt),
      })) ?? [],
    attachments:
      detailTask.attachments?.map((attachment) => ({
        id: attachment.id,
        label: attachment.label,
        filePath: attachment.filePath,
        mimeType: attachment.mimeType ?? null,
        fileSizeBytes: attachment.fileSizeBytes ?? null,
        uploadedBy: attachment.uploadedByUser
          ? {
              id: attachment.uploadedByUser.id ?? null,
              name:
                attachment.uploadedByUser.name?.trim() ||
                attachment.uploadedByUser.email ||
                'Equipe interna',
              email: attachment.uploadedByUser.email ?? null,
              avatarUrl: attachment.uploadedByUser.avatarUrl ?? null,
            }
          : null,
        createdAt: toIsoString(attachment.createdAt),
        updatedAt: toIsoString(attachment.updatedAt),
      })) ?? [],
    dependencies:
      detailTask.blockedByDependencies?.map((entry) => ({
        id: entry.id,
        direction: 'blocked_by',
        taskId: entry.dependsOnTask.id,
        title: entry.dependsOnTask.title,
        status: TASK_STATUS_FROM_DB[entry.dependsOnTask.status],
        priority: TASK_PRIORITY_FROM_DB[entry.dependsOnTask.priority],
        owner: resolveOwnerLabel(entry.dependsOnTask),
        ownerUserId: entry.dependsOnTask.ownerUserId,
        dueDate: toDateOnly(entry.dependsOnTask.dueDate),
      })) ?? [],
    dependents:
      detailTask.dependentTaskLinks?.map((entry) => ({
        id: entry.id,
        direction: 'blocks',
        taskId: entry.task.id,
        title: entry.task.title,
        status: TASK_STATUS_FROM_DB[entry.task.status],
        priority: TASK_PRIORITY_FROM_DB[entry.task.priority],
        owner: resolveOwnerLabel(entry.task),
        ownerUserId: entry.task.ownerUserId,
        dueDate: toDateOnly(entry.task.dueDate),
      })) ?? [],
    createdAt: toIsoString(task.createdAt),
    updatedAt: toIsoString(task.updatedAt),
  };
};

const mapAssignableUser = (user: {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
}) => ({
  id: user.id,
  name: user.name?.trim() || user.email,
  email: user.email,
  avatarUrl: user.avatarUrl,
});

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async listTasks(tenantId: string, query: ListTasksQueryDto) {
    const { page, limit, skip, take, isAll } = resolvePagination({
      page: query.page,
      limit: query.limit,
      all: query.all,
      defaultLimit: DEFAULT_LIMIT,
      maxLimit: MAX_LIMIT,
    });

    const tasks = await this.prisma.taskOrganizerTask.findMany({
      where: { tenantId },
      include: TASK_LIST_WITH_RELATIONS,
    });

    const rows = tasks.map(mapTaskListRecord);
    const filters = parseAdvancedFilters(query.filters);
    const grouping = parseGrouping(query.groupBy);
    const filtered = sortTaskRows(
      applyTaskFilters(applyTaskSearch(rows, query.q), filters),
      grouping,
    );
    const total = filtered.length;
    const paged = isAll ? filtered : filtered.slice(skip, skip + take);

    return {
      data: paged,
      pagination: buildPaginationMeta({
        page,
        limit,
        total,
        isAll,
      }),
    };
  }

  async getTask(tenantId: string, id: string) {
    return mapTaskRecord(await this.findTaskEntity(tenantId, id));
  }

  async createTask(tenantId: string, actorUserId: string, dto: CreateTaskDto) {
    const title = dto.title.trim();
    if (!title) {
      throw new BadRequestException('Informe um titulo para a tarefa.');
    }

    const ownerAssignment = await this.resolveOwnerAssignment(
      tenantId,
      dto.ownerUserId ?? actorUserId,
      dto.owner,
    );

    const startDate = this.parseTaskDate(dto.startDate);
    const dueDate = this.parseTaskDate(dto.dueDate);
    this.validateTaskWindow(startDate ?? null, dueDate ?? null);

    const isMilestone = dto.isMilestone ?? false;
    const milestoneDate = dueDate ?? startDate ?? null;
    const normalizedStartDate =
      isMilestone && milestoneDate ? milestoneDate : startDate ?? null;
    const normalizedDueDate =
      isMilestone && milestoneDate ? milestoneDate : dueDate ?? null;
    this.validateTaskWindow(normalizedStartDate, normalizedDueDate);

    const created = await this.prisma.taskOrganizerTask.create({
      data: {
        tenantId,
        title,
        summary: normalizeString(dto.summary),
        description: normalizeString(dto.description),
        status: this.toTaskStatus(dto.status),
        priority: this.toTaskPriority(dto.priority),
        kind: this.toTaskKind(dto.kind),
        owner: ownerAssignment.owner,
        ownerUserId: ownerAssignment.ownerUserId,
        team: normalizeString(dto.team),
        startDate: normalizedStartDate,
        dueDate: normalizedDueDate,
        isMilestone,
        progress: dto.progress,
        effortPoints: dto.effortPoints ?? null,
        tags: normalizeTags(dto.tags),
        internalNotes: normalizeString(dto.internalNotes),
      },
      include: TASK_WITH_RELATIONS,
    });

    return this.getTask(tenantId, created.id);
  }

  async updateTask(tenantId: string, id: string, dto: UpdateTaskDto) {
    const task = await this.findTaskEntity(tenantId, id);

    const data: Prisma.TaskOrganizerTaskUncheckedUpdateInput = {};
    let nextStartDate = task.startDate;
    let nextDueDate = task.dueDate;
    let nextIsMilestone = task.isMilestone;

    if (dto.title !== undefined) {
      if (!dto.title.trim()) {
        throw new BadRequestException('Informe um titulo para a tarefa.');
      }
      data.title = dto.title.trim();
    }
    if (dto.summary !== undefined) data.summary = normalizeString(dto.summary);
    if (dto.description !== undefined) {
      data.description = normalizeString(dto.description);
    }
    if (dto.status !== undefined) data.status = this.toTaskStatus(dto.status);
    if (dto.priority !== undefined) {
      data.priority = this.toTaskPriority(dto.priority);
    }
    if (dto.kind !== undefined) data.kind = this.toTaskKind(dto.kind);
    if (dto.team !== undefined) data.team = normalizeString(dto.team);
    if (dto.startDate !== undefined) {
      nextStartDate = this.parseTaskDate(dto.startDate) ?? null;
      data.startDate = nextStartDate;
    }
    if (dto.dueDate !== undefined) {
      nextDueDate = this.parseTaskDate(dto.dueDate) ?? null;
      data.dueDate = nextDueDate;
    }
    if (dto.isMilestone !== undefined) {
      nextIsMilestone = dto.isMilestone;
      data.isMilestone = dto.isMilestone;
    }

    if (nextIsMilestone) {
      const milestoneDate = nextDueDate ?? nextStartDate ?? null;
      nextStartDate = milestoneDate;
      nextDueDate = milestoneDate;
      data.startDate = nextStartDate;
      data.dueDate = nextDueDate;
    }

    this.validateTaskWindow(nextStartDate ?? null, nextDueDate ?? null);
    if (dto.progress !== undefined) data.progress = dto.progress;
    if (dto.effortPoints !== undefined) data.effortPoints = dto.effortPoints ?? null;
    if (dto.tags !== undefined) data.tags = normalizeTags(dto.tags);
    if (dto.internalNotes !== undefined) {
      data.internalNotes = normalizeString(dto.internalNotes);
    }

    if (dto.ownerUserId !== undefined || dto.owner !== undefined) {
      const ownerAssignment = await this.resolveOwnerAssignment(
        tenantId,
        dto.ownerUserId,
        dto.owner,
      );
      data.ownerUserId = ownerAssignment.ownerUserId;
      data.owner = ownerAssignment.owner;
    }

    const updated = await this.prisma.taskOrganizerTask.update({
      where: { id },
      data,
      include: TASK_WITH_RELATIONS,
    });

    return this.getTask(tenantId, updated.id);
  }

  async deleteTask(tenantId: string, id: string) {
    await this.findTaskEntity(tenantId, id);
    await this.prisma.taskOrganizerTask.delete({
      where: { id },
    });
    return { ok: true };
  }

  async listAssignableUsers(tenantId: string, search?: string) {
    const q = search?.trim();
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(q
          ? {
              OR: [{ name: { contains: q } }, { email: { contains: q } }],
            }
          : {}),
      },
      orderBy: [{ name: 'asc' }, { email: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
      },
      take: 100,
    });

    return users.map(mapAssignableUser);
  }

  async addChecklistItem(
    tenantId: string,
    taskId: string,
    dto: CreateTaskChecklistItemDto,
  ) {
    const task = await this.findTaskEntity(tenantId, taskId);
    const label = dto.label.trim();
    if (!label) {
      throw new BadRequestException('Informe um item para o checklist.');
    }

    const ownerAssignment = await this.resolveOwnerAssignment(
      tenantId,
      dto.ownerUserId,
      dto.owner ?? task.owner,
    );

    await this.prisma.taskOrganizerChecklistItem.create({
      data: {
        tenantId,
        taskId,
        label,
        owner: ownerAssignment.owner ?? task.owner,
        ownerUserId: ownerAssignment.ownerUserId ?? task.ownerUserId,
        dueDate: this.parseTaskDate(dto.dueDate) ?? task.dueDate,
        notes: normalizeString(dto.notes),
        sortOrder: task.checklistItems.length,
      },
    });

    return this.getTask(tenantId, taskId);
  }

  async toggleChecklistItem(tenantId: string, taskId: string, itemId: string) {
    await this.findTaskEntity(tenantId, taskId);
    const item = await this.findChecklistItem(tenantId, taskId, itemId);

    await this.prisma.taskOrganizerChecklistItem.update({
      where: { id: itemId },
      data: { done: !item.done },
    });

    return this.getTask(tenantId, taskId);
  }

  async updateChecklistItem(
    tenantId: string,
    taskId: string,
    itemId: string,
    dto: UpdateTaskChecklistItemDto,
  ) {
    await this.findTaskEntity(tenantId, taskId);
    await this.findChecklistItem(tenantId, taskId, itemId);

    const data: Prisma.TaskOrganizerChecklistItemUncheckedUpdateInput = {};

    if (dto.label !== undefined) {
      if (!dto.label.trim()) {
        throw new BadRequestException('Informe um item para o checklist.');
      }
      data.label = dto.label.trim();
    }

    if (dto.done !== undefined) {
      data.done = dto.done;
    }

    if (dto.notes !== undefined) {
      data.notes = normalizeString(dto.notes);
    }

    if (dto.dueDate !== undefined) {
      data.dueDate = this.parseTaskDate(dto.dueDate);
    }

    if (dto.ownerUserId !== undefined || dto.owner !== undefined) {
      const ownerAssignment = await this.resolveOwnerAssignment(
        tenantId,
        dto.ownerUserId,
        dto.owner,
      );
      data.ownerUserId = ownerAssignment.ownerUserId;
      data.owner = ownerAssignment.owner;
    }

    await this.prisma.taskOrganizerChecklistItem.update({
      where: { id: itemId },
      data,
    });

    return this.getTask(tenantId, taskId);
  }

  async deleteChecklistItem(tenantId: string, taskId: string, itemId: string) {
    await this.findTaskEntity(tenantId, taskId);
    await this.findChecklistItem(tenantId, taskId, itemId);

    await this.prisma.taskOrganizerChecklistItem.delete({
      where: { id: itemId },
    });

    return this.getTask(tenantId, taskId);
  }

  async addSubtask(tenantId: string, taskId: string, dto: CreateTaskSubtaskDto) {
    const task = await this.findTaskEntity(tenantId, taskId);
    const title = dto.title.trim();
    if (!title) {
      throw new BadRequestException('Informe um titulo para a subtarefa.');
    }

    const ownerAssignment = await this.resolveOwnerAssignment(
      tenantId,
      dto.ownerUserId,
      dto.owner ?? task.owner,
    );

    const startDate = this.parseTaskDate(dto.startDate) ?? task.startDate ?? null;
    const dueDate = this.parseTaskDate(dto.dueDate) ?? task.dueDate ?? null;
    this.validateSubtaskWindow(task, startDate, dueDate);

    await this.prisma.taskOrganizerSubtask.create({
      data: {
        tenantId,
        taskId,
        title,
        status: dto.status ? this.toTaskStatus(dto.status) : 'BACKLOG',
        owner: ownerAssignment.owner ?? task.owner,
        ownerUserId: ownerAssignment.ownerUserId ?? task.ownerUserId,
        startDate,
        dueDate,
        description: normalizeString(dto.description),
        sortOrder: task.subtasks.length,
      },
    });

    return this.getTask(tenantId, taskId);
  }

  async toggleSubtaskStatus(
    tenantId: string,
    taskId: string,
    subtaskId: string,
  ) {
    await this.findTaskEntity(tenantId, taskId);
    const subtask = await this.findSubtask(tenantId, taskId, subtaskId);

    await this.prisma.taskOrganizerSubtask.update({
      where: { id: subtaskId },
      data: {
        status: subtask.status === 'DONE' ? 'IN_PROGRESS' : 'DONE',
      },
    });

    return this.getTask(tenantId, taskId);
  }

  async updateSubtask(
    tenantId: string,
    taskId: string,
    subtaskId: string,
    dto: UpdateTaskSubtaskDto,
  ) {
    const task = await this.findTaskEntity(tenantId, taskId);
    const subtask = await this.findSubtask(tenantId, taskId, subtaskId);

    const data: Prisma.TaskOrganizerSubtaskUncheckedUpdateInput = {};
    let nextStartDate = subtask.startDate;
    let nextDueDate = subtask.dueDate;

    if (dto.title !== undefined) {
      if (!dto.title.trim()) {
        throw new BadRequestException('Informe um titulo para a subtarefa.');
      }
      data.title = dto.title.trim();
    }

    if (dto.status !== undefined) {
      data.status = this.toTaskStatus(dto.status);
    }

    if (dto.description !== undefined) {
      data.description = normalizeString(dto.description);
    }

    if (dto.startDate !== undefined) {
      nextStartDate = this.parseTaskDate(dto.startDate) ?? null;
      data.startDate = nextStartDate;
    }

    if (dto.dueDate !== undefined) {
      nextDueDate = this.parseTaskDate(dto.dueDate) ?? null;
      data.dueDate = nextDueDate;
    }

    if (dto.ownerUserId !== undefined || dto.owner !== undefined) {
      const ownerAssignment = await this.resolveOwnerAssignment(
        tenantId,
        dto.ownerUserId,
        dto.owner,
      );
      data.ownerUserId = ownerAssignment.ownerUserId;
      data.owner = ownerAssignment.owner;
    }

    this.validateSubtaskWindow(task, nextStartDate, nextDueDate);

    await this.prisma.taskOrganizerSubtask.update({
      where: { id: subtaskId },
      data,
    });

    return this.getTask(tenantId, taskId);
  }

  async deleteSubtask(tenantId: string, taskId: string, subtaskId: string) {
    await this.findTaskEntity(tenantId, taskId);
    await this.findSubtask(tenantId, taskId, subtaskId);

    await this.prisma.taskOrganizerSubtask.delete({
      where: { id: subtaskId },
    });

    return this.getTask(tenantId, taskId);
  }

  async addComment(
    tenantId: string,
    actorUserId: string,
    taskId: string,
    dto: CreateTaskCommentDto,
  ) {
    await this.findTaskEntity(tenantId, taskId);
    const body = dto.body.trim();
    if (!body) {
      throw new BadRequestException('Informe um comentario.');
    }

    const mentionUserIds = await this.resolveMentionUserIds(tenantId, dto.mentionUserIds);

    await this.prisma.taskOrganizerComment.create({
      data: {
        tenantId,
        taskId,
        authorUserId: actorUserId,
        body,
        mentionUserIds,
      },
    });

    return this.getTask(tenantId, taskId);
  }

  async deleteComment(tenantId: string, taskId: string, commentId: string) {
    await this.findTaskEntity(tenantId, taskId);
    const comment = await this.findComment(tenantId, taskId, commentId);

    await this.prisma.taskOrganizerComment.delete({
      where: { id: comment.id },
    });

    return this.getTask(tenantId, taskId);
  }

  async addAttachment(
    tenantId: string,
    actorUserId: string,
    taskId: string,
    dto: CreateTaskAttachmentDto,
  ) {
    await this.findTaskEntity(tenantId, taskId);
    const label = dto.label.trim();
    const filePath = dto.filePath.trim();

    if (!label) {
      throw new BadRequestException('Informe um nome para o anexo.');
    }

    if (!filePath.startsWith('/uploads/tasks/')) {
      throw new BadRequestException('Caminho de anexo invalido.');
    }

    await this.prisma.taskOrganizerAttachment.create({
      data: {
        tenantId,
        taskId,
        uploadedByUserId: actorUserId,
        label,
        filePath,
        mimeType: normalizeString(dto.mimeType),
        fileSizeBytes: dto.fileSizeBytes ?? null,
      },
    });

    return this.getTask(tenantId, taskId);
  }

  async deleteAttachment(tenantId: string, taskId: string, attachmentId: string) {
    await this.findTaskEntity(tenantId, taskId);
    const attachment = await this.findAttachment(tenantId, taskId, attachmentId);

    await this.prisma.taskOrganizerAttachment.delete({
      where: { id: attachment.id },
    });

    return this.getTask(tenantId, taskId);
  }

  async addDependency(
    tenantId: string,
    taskId: string,
    dto: CreateTaskDependencyDto,
  ) {
    await this.findTaskEntity(tenantId, taskId);
    if (dto.dependsOnTaskId === taskId) {
      throw new BadRequestException('Uma tarefa nao pode depender dela mesma.');
    }

    await this.findTaskEntity(tenantId, dto.dependsOnTaskId);

    const existing = await this.prisma.taskOrganizerTaskDependency.findFirst({
      where: {
        tenantId,
        taskId,
        dependsOnTaskId: dto.dependsOnTaskId,
      },
    });

    if (!existing) {
      await this.prisma.taskOrganizerTaskDependency.create({
        data: {
          tenantId,
          taskId,
          dependsOnTaskId: dto.dependsOnTaskId,
        },
      });
    }

    return this.getTask(tenantId, taskId);
  }

  async deleteDependency(tenantId: string, taskId: string, dependencyId: string) {
    await this.findTaskEntity(tenantId, taskId);
    const dependency = await this.findDependency(tenantId, taskId, dependencyId);

    await this.prisma.taskOrganizerTaskDependency.delete({
      where: { id: dependency.id },
    });

    return this.getTask(tenantId, taskId);
  }

  async listAuditLogs(
    tenantId: string,
    taskId: string,
    params?: { page?: number; limit?: number },
  ) {
    const task = await this.findTaskEntity(tenantId, taskId);
    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit =
      params?.limit && params.limit > 0 ? Math.min(params.limit, 200) : 50;
    const skip = (page - 1) * limit;

    const checklistIds = task.checklistItems.map((item) => item.id);
    const subtaskIds = task.subtasks.map((item) => item.id);
    const commentIds = task.comments.map((item) => item.id);
    const attachmentIds = task.attachments.map((item) => item.id);
    const dependencyIds = [
      ...task.blockedByDependencies.map((item) => item.id),
      ...task.dependentTaskLinks.map((item) => item.id),
    ];

    const where: Prisma.AuditLogWhereInput = {
      tenantId,
      OR: [
        {
          entity: 'TaskOrganizerTask',
          entityId: taskId,
        },
        ...(checklistIds.length
          ? [
              {
                entity: 'TaskOrganizerChecklistItem',
                entityId: { in: checklistIds },
              } satisfies Prisma.AuditLogWhereInput,
            ]
          : []),
        ...(subtaskIds.length
          ? [
              {
                entity: 'TaskOrganizerSubtask',
                entityId: { in: subtaskIds },
              } satisfies Prisma.AuditLogWhereInput,
            ]
          : []),
        ...(commentIds.length
          ? [
              {
                entity: 'TaskOrganizerComment',
                entityId: { in: commentIds },
              } satisfies Prisma.AuditLogWhereInput,
            ]
          : []),
        ...(attachmentIds.length
          ? [
              {
                entity: 'TaskOrganizerAttachment',
                entityId: { in: attachmentIds },
              } satisfies Prisma.AuditLogWhereInput,
            ]
          : []),
        ...(dependencyIds.length
          ? [
              {
                entity: 'TaskOrganizerTaskDependency',
                entityId: { in: dependencyIds },
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
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
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

  private async findTaskEntity(tenantId: string, id: string) {
    const task = await this.prisma.taskOrganizerTask.findFirst({
      where: { id, tenantId },
      include: TASK_DETAIL_WITH_RELATIONS,
    });

    if (!task) {
      throw new NotFoundException('Tarefa nao encontrada.');
    }

    return task;
  }

  private async findChecklistItem(tenantId: string, taskId: string, itemId: string) {
    const item = await this.prisma.taskOrganizerChecklistItem.findFirst({
      where: { id: itemId, taskId, tenantId },
    });

    if (!item) {
      throw new NotFoundException('Item de checklist nao encontrado.');
    }

    return item;
  }

  private async findSubtask(tenantId: string, taskId: string, subtaskId: string) {
    const subtask = await this.prisma.taskOrganizerSubtask.findFirst({
      where: { id: subtaskId, taskId, tenantId },
    });

    if (!subtask) {
      throw new NotFoundException('Subtarefa nao encontrada.');
    }

    return subtask;
  }

  private async findComment(tenantId: string, taskId: string, commentId: string) {
    const comment = await this.prisma.taskOrganizerComment.findFirst({
      where: { id: commentId, taskId, tenantId },
    });

    if (!comment) {
      throw new NotFoundException('Comentario nao encontrado.');
    }

    return comment;
  }

  private async findAttachment(tenantId: string, taskId: string, attachmentId: string) {
    const attachment = await this.prisma.taskOrganizerAttachment.findFirst({
      where: { id: attachmentId, taskId, tenantId },
    });

    if (!attachment) {
      throw new NotFoundException('Anexo nao encontrado.');
    }

    return attachment;
  }

  private async findDependency(tenantId: string, taskId: string, dependencyId: string) {
    const dependency = await this.prisma.taskOrganizerTaskDependency.findFirst({
      where: { id: dependencyId, taskId, tenantId },
    });

    if (!dependency) {
      throw new NotFoundException('Dependencia nao encontrada.');
    }

    return dependency;
  }

  private toTaskStatus(value: string): TaskOrganizerStatus {
    const resolved = TASK_STATUS_TO_DB[value];
    if (!resolved) {
      throw new BadRequestException('Status de tarefa invalido.');
    }
    return resolved;
  }

  private toTaskPriority(value: string): TaskOrganizerPriority {
    const resolved = TASK_PRIORITY_TO_DB[value];
    if (!resolved) {
      throw new BadRequestException('Prioridade invalida.');
    }
    return resolved;
  }

  private toTaskKind(value: string): TaskOrganizerKind {
    const resolved = TASK_KIND_TO_DB[value];
    if (!resolved) {
      throw new BadRequestException('Tipo de tarefa invalido.');
    }
    return resolved;
  }

  private parseTaskDate(value?: string | null) {
    if (value === undefined) return undefined;
    if (value === null || !value.trim()) return null;
    const parsed = parseDateInput(value);
    if (!parsed) {
      throw new BadRequestException('Data invalida.');
    }
    return parsed;
  }

  private validateTaskWindow(startDate?: Date | null, dueDate?: Date | null) {
    if (
      startDate &&
      dueDate &&
      startDate.getTime() > dueDate.getTime()
    ) {
      throw new BadRequestException(
        'A data de inicio nao pode ser maior que a data de entrega.',
      );
    }
  }

  private validateSubtaskWindow(
    task: TaskDetailEntity,
    startDate?: Date | null,
    dueDate?: Date | null,
  ) {
    this.validateTaskWindow(startDate, dueDate);

    const taskStart = task.startDate ?? null;
    const taskDue = task.dueDate ?? null;

    if (taskStart && startDate && startDate.getTime() < taskStart.getTime()) {
      throw new BadRequestException(
        'O inicio da subtarefa precisa estar dentro do periodo da tarefa.',
      );
    }

    if (taskStart && dueDate && dueDate.getTime() < taskStart.getTime()) {
      throw new BadRequestException(
        'A entrega da subtarefa precisa estar dentro do periodo da tarefa.',
      );
    }

    if (taskDue && startDate && startDate.getTime() > taskDue.getTime()) {
      throw new BadRequestException(
        'O inicio da subtarefa precisa estar dentro do periodo da tarefa.',
      );
    }

    if (taskDue && dueDate && dueDate.getTime() > taskDue.getTime()) {
      throw new BadRequestException(
        'A entrega da subtarefa precisa estar dentro do periodo da tarefa.',
      );
    }
  }

  private async resolveOwnerAssignment(
    tenantId: string,
    ownerUserId?: string | null,
    ownerName?: string | null,
  ) {
    if (ownerUserId === undefined) {
      return {
        ownerUserId: undefined,
        owner: ownerName === undefined ? undefined : normalizeString(ownerName),
      };
    }

    if (ownerUserId === null || !ownerUserId.trim()) {
      return {
        ownerUserId: null,
        owner: null,
      };
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: ownerUserId,
        tenantId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario responsavel nao encontrado.');
    }

    return {
      ownerUserId: user.id,
      owner: user.name?.trim() || user.email,
    };
  }

  private async resolveMentionUserIds(tenantId: string, mentionUserIds?: string[]) {
    const uniqueIds = Array.from(new Set((mentionUserIds ?? []).map((item) => item.trim()).filter(Boolean)));
    if (!uniqueIds.length) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        id: { in: uniqueIds },
      },
      select: { id: true },
    });

    return users.map((user) => user.id);
  }
}
