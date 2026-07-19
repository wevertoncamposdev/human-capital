"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  TASK_KIND_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
} from "@/modules/tasks/shared/domain/tasks.constants";
import type {
  TaskAssignableUser,
  TaskMutationInput,
} from "@/modules/tasks/shared/domain/types";

const lineInputClassName =
  "h-10 rounded-none border-0 border-b border-border/60 bg-transparent px-0 shadow-none focus-visible:border-primary focus-visible:ring-0";

const lineTextareaClassName =
  "min-h-[120px] rounded-none border-0 border-b border-border/60 bg-transparent px-0 py-2 shadow-none focus-visible:border-primary focus-visible:ring-0";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

export function TaskDetailForm({
  value,
  onChange,
  onCommitField,
  onCommitDraft,
  assignableUsers,
  assignableUsersLoading = false,
}: {
  value: TaskMutationInput;
  onChange: React.Dispatch<React.SetStateAction<TaskMutationInput>>;
  onCommitField?: <K extends keyof TaskMutationInput>(
    field: K,
    nextValue?: TaskMutationInput[K],
  ) => void;
  onCommitDraft?: (nextDraft: TaskMutationInput) => void;
  assignableUsers: TaskAssignableUser[];
  assignableUsersLoading?: boolean;
}) {
  const updateField = React.useCallback(
    <K extends keyof TaskMutationInput>(field: K, nextValue: TaskMutationInput[K]) => {
      onChange((previous) => ({ ...previous, [field]: nextValue }));
    },
    [onChange],
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-5 lg:grid-cols-2">
        <Field label="Titulo">
          <Input
            value={value.title}
            onChange={(event) => updateField("title", event.target.value)}
            onBlur={() => onCommitField?.("title")}
            className={lineInputClassName}
            placeholder="Titulo da tarefa"
          />
        </Field>

        <Field label="Resumo curto">
          <Input
            value={value.summary ?? ""}
            onChange={(event) => updateField("summary", event.target.value || null)}
            onBlur={() => onCommitField?.("summary")}
            className={lineInputClassName}
            placeholder="Resumo rapido"
          />
        </Field>
      </section>

      <section className="grid gap-5 lg:grid-cols-4">
        <Field label="Status">
          <Select
            value={value.status}
            onValueChange={(next) => {
              const nextValue = next as TaskMutationInput["status"];
              updateField("status", nextValue);
              onCommitField?.("status", nextValue);
            }}
          >
            <SelectTrigger className={lineInputClassName}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Prioridade">
          <Select
            value={value.priority}
            onValueChange={(next) => {
              const nextValue = next as TaskMutationInput["priority"];
              updateField("priority", nextValue);
              onCommitField?.("priority", nextValue);
            }}
          >
            <SelectTrigger className={lineInputClassName}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_PRIORITY_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Tipo">
          <Select
            value={value.kind}
            onValueChange={(next) => {
              const nextValue = next as TaskMutationInput["kind"];
              updateField("kind", nextValue);
              onCommitField?.("kind", nextValue);
            }}
          >
            <SelectTrigger className={lineInputClassName}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TASK_KIND_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Responsavel">
          <Select
            value={value.ownerUserId ?? "__unassigned__"}
            onValueChange={(next) => {
              const selectedUser =
                next === "__unassigned__"
                  ? null
                  : assignableUsers.find((option) => option.id === next) ?? null;
              const nextDraft: TaskMutationInput = {
                ...value,
                ownerUserId: selectedUser?.id ?? null,
                owner: selectedUser?.name ?? null,
              };
              onChange(() => nextDraft);
              onCommitDraft?.(nextDraft);
            }}
          >
            <SelectTrigger className={lineInputClassName}>
              <SelectValue
                placeholder={
                  assignableUsersLoading ? "Carregando usuarios..." : "Sem responsavel"
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__unassigned__">Sem responsavel</SelectItem>
              {assignableUsers.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </section>

      <section className="grid gap-5 lg:grid-cols-4">
        <Field label="Time">
          <Input
            value={value.team ?? ""}
            onChange={(event) => updateField("team", event.target.value || null)}
            onBlur={() => onCommitField?.("team")}
            className={lineInputClassName}
            placeholder="Area ou time"
          />
        </Field>

        <Field label="Inicio">
          <Input
            type="date"
            value={value.startDate ?? ""}
            onChange={(event) => updateField("startDate", event.target.value || null)}
            onBlur={() => onCommitField?.("startDate")}
            className={lineInputClassName}
          />
        </Field>

        <Field label="Entrega">
          <Input
            type="date"
            value={value.dueDate ?? ""}
            onChange={(event) => updateField("dueDate", event.target.value || null)}
            onBlur={() => onCommitField?.("dueDate")}
            className={lineInputClassName}
          />
        </Field>

        <Field label="Pontos">
          <Input
            type="number"
            min={0}
            value={value.effortPoints ?? ""}
            onChange={(event) =>
              updateField(
                "effortPoints",
                event.target.value ? Number(event.target.value) : null,
              )
            }
            onBlur={() => onCommitField?.("effortPoints")}
            className={lineInputClassName}
          />
        </Field>
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_14rem]">
        <Field label="Descricao">
          <Textarea
            value={value.description ?? ""}
            onChange={(event) => updateField("description", event.target.value || null)}
            onBlur={() => onCommitField?.("description")}
            className={lineTextareaClassName}
            placeholder="Descreva contexto, objetivo e proximos passos."
          />
        </Field>

        <div className="space-y-5">
          <Field label="Marco">
            <div className="flex h-10 items-center justify-between border-b border-border/60">
              <div className="text-sm text-muted-foreground">
                Exibir como milestone no Gantt
              </div>
              <Switch
                checked={value.isMilestone}
                onCheckedChange={(checked) => {
                  updateField("isMilestone", checked);
                  onCommitField?.("isMilestone", checked);
                }}
              />
            </div>
          </Field>

          <Field label="Progresso">
            <div className="space-y-3">
              <Input
                type="range"
                min={0}
                max={100}
                step={5}
                value={value.progress}
                onChange={(event) => updateField("progress", Number(event.target.value))}
                onBlur={() => onCommitField?.("progress")}
                className="h-10 rounded-none border-0 px-0 shadow-none"
              />
              <div className="text-sm font-medium text-foreground">{value.progress}%</div>
            </div>
          </Field>
        </div>
      </section>
    </div>
  );
}
