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
import { TASK_STATUS_OPTIONS } from "@/modules/tasks/shared/domain/tasks.constants";
import type {
  TaskAssignableUser,
  TaskChecklistItemMutationInput,
  TaskSubtaskMutationInput,
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

type AssignableProps<T extends { ownerUserId?: string | null; owner?: string | null }> = {
  value: T;
  assignableUsers: TaskAssignableUser[];
  assignableUsersLoading?: boolean;
  onChange: React.Dispatch<React.SetStateAction<T>>;
};

function AssignedUserField<T extends { ownerUserId?: string | null; owner?: string | null }>({
  value,
  assignableUsers,
  assignableUsersLoading,
  onChange,
}: AssignableProps<T>) {
  return (
    <Field label="Responsavel">
      <Select
        value={value.ownerUserId ?? "__unassigned__"}
        onValueChange={(next) => {
          const selectedUser =
            next === "__unassigned__"
              ? null
              : assignableUsers.find((option) => option.id === next) ?? null;
          onChange((previous) => ({
            ...previous,
            ownerUserId: selectedUser?.id ?? null,
            owner: selectedUser?.name ?? null,
          }));
        }}
      >
        <SelectTrigger className={lineInputClassName}>
          <SelectValue
            placeholder={assignableUsersLoading ? "Carregando usuarios..." : "Sem responsavel"}
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
  );
}

export function TaskChecklistItemForm({
  value,
  onChange,
  assignableUsers,
  assignableUsersLoading,
}: {
  value: TaskChecklistItemMutationInput;
  onChange: React.Dispatch<React.SetStateAction<TaskChecklistItemMutationInput>>;
  assignableUsers: TaskAssignableUser[];
  assignableUsersLoading?: boolean;
}) {
  return (
    <div className="space-y-5">
      <Field label="Item">
        <Input
          value={value.label}
          onChange={(event) =>
            onChange((previous) => ({ ...previous, label: event.target.value }))
          }
          className={lineInputClassName}
          placeholder="Nome do item"
        />
      </Field>

      <section className="grid gap-5 sm:grid-cols-2">
        <AssignedUserField
          value={value}
          assignableUsers={assignableUsers}
          assignableUsersLoading={assignableUsersLoading}
          onChange={onChange}
        />

        <Field label="Entrega">
          <Input
            type="date"
            value={value.dueDate ?? ""}
            onChange={(event) =>
              onChange((previous) => ({
                ...previous,
                dueDate: event.target.value || null,
              }))
            }
            className={lineInputClassName}
          />
        </Field>
      </section>

      <Field label="Notas">
        <Textarea
          value={value.notes ?? ""}
          onChange={(event) =>
            onChange((previous) => ({
              ...previous,
              notes: event.target.value || null,
            }))
          }
          className={lineTextareaClassName}
          placeholder="Observacoes para a execucao."
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={value.done}
          onChange={(event) =>
            onChange((previous) => ({ ...previous, done: event.target.checked }))
          }
        />
        Concluido
      </label>
    </div>
  );
}

export function TaskSubtaskForm({
  value,
  onChange,
  assignableUsers,
  assignableUsersLoading,
  parentRange,
}: {
  value: TaskSubtaskMutationInput;
  onChange: React.Dispatch<React.SetStateAction<TaskSubtaskMutationInput>>;
  assignableUsers: TaskAssignableUser[];
  assignableUsersLoading?: boolean;
  parentRange?: {
    startDate?: string | null;
    dueDate?: string | null;
  };
}) {
  return (
    <div className="space-y-5">
      <Field label="Subtarefa">
        <Input
          value={value.title}
          onChange={(event) =>
            onChange((previous) => ({ ...previous, title: event.target.value }))
          }
          className={lineInputClassName}
          placeholder="Titulo da subtarefa"
        />
      </Field>

      <section className="grid gap-5 sm:grid-cols-4">
        <Field label="Status">
          <Select
            value={value.status}
            onValueChange={(next) =>
              onChange((previous) => ({
                ...previous,
                status: next as TaskSubtaskMutationInput["status"],
              }))
            }
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

        <AssignedUserField
          value={value}
          assignableUsers={assignableUsers}
          assignableUsersLoading={assignableUsersLoading}
          onChange={onChange}
        />

        <Field label="Inicio">
          <Input
            type="date"
            value={value.startDate ?? ""}
            min={parentRange?.startDate ?? undefined}
            max={parentRange?.dueDate ?? value.dueDate ?? undefined}
            onChange={(event) =>
              onChange((previous) => ({
                ...previous,
                startDate: event.target.value || null,
              }))
            }
            className={lineInputClassName}
          />
        </Field>

        <Field label="Entrega">
          <Input
            type="date"
            value={value.dueDate ?? ""}
            min={value.startDate ?? parentRange?.startDate ?? undefined}
            max={parentRange?.dueDate ?? undefined}
            onChange={(event) =>
              onChange((previous) => ({
                ...previous,
                dueDate: event.target.value || null,
              }))
            }
            className={lineInputClassName}
          />
        </Field>
      </section>

      <Field label="Descricao">
        <Textarea
          value={value.description ?? ""}
          onChange={(event) =>
            onChange((previous) => ({
              ...previous,
              description: event.target.value || null,
            }))
          }
          className={lineTextareaClassName}
          placeholder="Contexto e definicao de pronto."
        />
      </Field>

      {parentRange?.startDate || parentRange?.dueDate ? (
        <div className="text-xs text-muted-foreground">
          Periodo permitido: {parentRange?.startDate ?? "..."} ate {parentRange?.dueDate ?? "..."}
        </div>
      ) : null}
    </div>
  );
}
