"use client";

import * as React from "react";
import type { Attendance } from "@/features/attendances/domain/types";
import { AttendanceForm } from "@/features/attendances/ui/AttendanceForm";
import {
  createAttendance,
  deleteAttendance,
  getAttendancesByPersonId,
  updateAttendance,
} from "@/features/attendances/data/attendances-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Briefcase, HeartHandshake, Home, Users } from "lucide-react";

type AttendancesListProps = {
  peopleId: string;
};

const attendanceIcons: Record<
  Attendance["type"],
  React.ElementType
> = {
  Social: HeartHandshake,
  Psicologico: Users,
  Familiar: Home,
  Outro: Briefcase,
};

export function AttendancesList({ peopleId }: AttendancesListProps) {
  const [items, setItems] = React.useState<Attendance[]>([]);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Attendance | null>(null);

  const loadItems = React.useCallback(async () => {
    const data = await getAttendancesByPersonId(peopleId);
    setItems(data);
  }, [peopleId]);

  React.useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleSave = async (data: Omit<Attendance, "id">) => {
    if (editing) {
      await updateAttendance(peopleId, editing.id, data);
    } else {
      await createAttendance(peopleId, data);
    }
    await loadItems();
    setOpen(false);
    setEditing(null);
  };

  const handleEdit = (item: Attendance) => {
    setEditing(item);
    setOpen(true);
  };

  const handleRemove = async (item: Attendance) => {
    await deleteAttendance(peopleId, item.id);
    await loadItems();
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Atendimento</CardTitle>
          <CardDescription>Historico de atendimentos.</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Novo atendimento
        </Button>
      </CardHeader>
      <CardContent>
        {items.length ? (
          <ol className="relative ml-3 border-l pl-5">
            {items.map((attendance) => {
              const Icon = attendanceIcons[attendance.type];
              return (
                <li key={attendance.id} className="mb-6 last:mb-0">
                  <button
                    type="button"
                    className="group w-full text-left"
                    onClick={() => handleEdit(attendance)}
                  >
                    <span className="absolute -left-3 mt-1.5 flex size-6 items-center justify-center rounded-full border bg-background text-muted-foreground">
                      <Icon className="size-3.5" />
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {attendance.date}
                      </Badge>
                      <p className="text-sm font-semibold">
                        {attendance.title}
                      </p>
                      <Badge variant="secondary" className="text-[11px]">
                        {attendance.staffName}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {attendance.summary}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {attendance.type}
                    </p>
                  </button>
              </li>
            );
          })}
        </ol>
        ) : (
          <p className="text-xs text-muted-foreground">
            Nenhum atendimento registrado.
          </p>
        )}
      </CardContent>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setEditing(null);
        }}
      >
        <DialogContent className="w-[min(96vw,960px)] !max-w-[min(96vw,960px)] sm:!max-w-[960px] p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>
              {editing ? "Editar atendimento" : "Novo atendimento"}
            </DialogTitle>
            <DialogDescription>
              Registre o atendimento com detalhes e observacoes.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto px-6 pb-6 pt-4">
            <AttendanceForm
              initialValues={editing ?? undefined}
              onSubmit={handleSave}
              onCancel={() => setOpen(false)}
              submitLabel={editing ? "Salvar" : "Adicionar"}
            />
            {editing ? (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    handleRemove(editing);
                    setOpen(false);
                  }}
                >
                  Remover
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
