"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  TASK_DUE_STATE_BADGE_CLASSNAMES,
  TASK_PRIORITY_BADGE_CLASSNAMES,
  TASK_STATUS_BADGE_CLASSNAMES,
} from "@/modules/tasks/shared/domain/tasks.constants";
import type { TaskPriority, TaskRecord, TaskStatus } from "@/modules/tasks/shared/domain/types";

function TaskCardField({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <div className="min-w-0 truncate text-right text-[12px] text-foreground">{value}</div>
    </div>
  );
}

function StatusBadge({ value }: { value: TaskStatus }) {
  return (
    <Badge className={cn("rounded-full px-2 text-[10px]", TASK_STATUS_BADGE_CLASSNAMES[value])}>
      {value}
    </Badge>
  );
}

function PriorityBadge({ value }: { value: TaskPriority }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2 text-[10px]", TASK_PRIORITY_BADGE_CLASSNAMES[value])}
    >
      {value}
    </Badge>
  );
}

function DueStateBadge({ task }: { task: TaskRecord }) {
  return (
    <Badge
      variant="outline"
      className={cn("rounded-full px-2 text-[10px]", TASK_DUE_STATE_BADGE_CLASSNAMES[task.dueState])}
    >
      {task.dueState}
    </Badge>
  );
}

export function TaskCard({ task }: { task: TaskRecord }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background px-3 py-3">
      <div className="truncate text-sm font-medium text-foreground">{task.title}</div>

      <div className="mt-3 grid gap-2 border-t border-border/50 pt-3">
        <TaskCardField label="Tipo" value={task.kind} />
        <TaskCardField label="Status" value={<StatusBadge value={task.status} />} />
        <TaskCardField label="Prioridade" value={<PriorityBadge value={task.priority} />} />
        <TaskCardField label="Prazo" value={<DueStateBadge task={task} />} />
        <TaskCardField label="Responsavel" value={task.owner ?? "-"} />
        <TaskCardField label="Entrega" value={task.dueDate ?? "-"} />
      </div>

      <div className="mt-3 border-t border-border/50 pt-3">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          <span>Progresso</span>
          <span>{task.progress}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${Math.max(0, Math.min(task.progress, 100))}%` }}
          />
        </div>
      </div>
    </div>
  );
}
