"use client";

import * as React from "react";
import type { Assessment } from "@/features/assessments/domain/types";
import { AssessmentForm } from "@/features/assessments/ui/AssessmentForm";
import {
  createAssessment,
  deleteAssessment,
  getAssessmentsByPersonId,
  updateAssessment,
} from "@/features/assessments/data/assessments-service";
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
import { BookOpen } from "lucide-react";

type AssessmentsListProps = {
  peopleId: string;
};

export function AssessmentsList({ peopleId }: AssessmentsListProps) {
  const [items, setItems] = React.useState<Assessment[]>([]);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Assessment | null>(null);

  const loadItems = React.useCallback(async () => {
    const data = await getAssessmentsByPersonId(peopleId);
    setItems(data);
  }, [peopleId]);

  React.useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleSave = async (data: Omit<Assessment, "id">) => {
    if (editing) {
      await updateAssessment(peopleId, editing.id, data);
    } else {
      await createAssessment(peopleId, data);
    }
    await loadItems();
    setOpen(false);
    setEditing(null);
  };

  const handleEdit = (item: Assessment) => {
    setEditing(item);
    setOpen(true);
  };

  const handleRemove = async (item: Assessment) => {
    await deleteAssessment(peopleId, item.id);
    await loadItems();
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Avaliacao</CardTitle>
          <CardDescription>Registros de avaliacao.</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Nova avaliacao
        </Button>
      </CardHeader>
      <CardContent>
        {items.length ? (
          <ol className="relative ml-3 border-l pl-5">
            {items.map((entry) => (
              <li key={entry.id} className="mb-6 last:mb-0">
                <button
                  type="button"
                  className="group w-full text-left"
                  onClick={() => handleEdit(entry)}
                >
                  <span className="absolute -left-3 mt-1.5 flex size-6 items-center justify-center rounded-full border bg-background text-muted-foreground">
                    <BookOpen className="size-3.5" />
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {entry.date}
                    </Badge>
                    <p className="text-sm font-semibold">{entry.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{entry.summary}</p>
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-xs text-muted-foreground">
            Nenhuma avaliacao registrada.
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
              {editing ? "Editar avaliacao" : "Nova avaliacao"}
            </DialogTitle>
            <DialogDescription>
              Registre os detalhes da avaliacao.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto px-6 pb-6 pt-4">
            <AssessmentForm
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
