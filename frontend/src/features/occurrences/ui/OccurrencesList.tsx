"use client";

import * as React from "react";
import type { Occurrence } from "@/features/occurrences/domain/types";
import { OccurrenceForm } from "@/features/occurrences/ui/OccurrenceForm";
import type { OccurrenceFormValues } from "@/features/occurrences/config/occurrence-form-config";
import {
  createOccurrence,
  deleteOccurrence,
  getOccurrencesByPersonId,
  updateOccurrence,
} from "@/features/occurrences/data/occurrences-service";
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
import { AlertTriangle } from "lucide-react";

type OccurrencesListProps = {
  peopleId: string;
};

const toFormValues = (occurrence: Occurrence): OccurrenceFormValues => ({
  title: occurrence.title,
  type: occurrence.type,
  status: occurrence.status,
  date: occurrence.date,
  summary: occurrence.summary,
  initialReportHtml: occurrence.initialReportHtml,
  actionItemsText: occurrence.actionItems.join("\n"),
  progressNotesHtml: occurrence.progressNotesHtml,
  resolutionHtml: occurrence.resolutionHtml,
});

const fromFormValues = (values: OccurrenceFormValues) => ({
  title: values.title,
  type: values.type,
  status: values.status,
  date: values.date,
  summary: values.summary,
  initialReportHtml: values.initialReportHtml,
  actionItems: values.actionItemsText
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean),
  progressNotesHtml: values.progressNotesHtml,
  resolutionHtml: values.resolutionHtml,
});

export function OccurrencesList({ peopleId }: OccurrencesListProps) {
  const [items, setItems] = React.useState<Occurrence[]>([]);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Occurrence | null>(null);

  const loadItems = React.useCallback(async () => {
    const data = await getOccurrencesByPersonId(peopleId);
    setItems(data);
  }, [peopleId]);

  React.useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleSave = async (values: OccurrenceFormValues) => {
    const payload = fromFormValues(values);
    if (editing) {
      await updateOccurrence(peopleId, editing.id, payload);
    } else {
      await createOccurrence(peopleId, payload);
    }
    await loadItems();
    setOpen(false);
    setEditing(null);
  };

  const handleEdit = (item: Occurrence) => {
    setEditing(item);
    setOpen(true);
  };

  const handleRemove = async (item: Occurrence) => {
    await deleteOccurrence(peopleId, item.id);
    await loadItems();
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Ocorrencias</CardTitle>
          <CardDescription>Registro de ocorrencias e etapas.</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Nova ocorrencia
        </Button>
      </CardHeader>
      <CardContent>
        {items.length ? (
          <ol className="relative ml-3 border-l pl-5">
            {items.map((occurrence) => (
              <li key={occurrence.id} className="mb-6 last:mb-0">
                <button
                  type="button"
                  className="group w-full text-left"
                  onClick={() => handleEdit(occurrence)}
                >
                  <span className="absolute -left-3 mt-1.5 flex size-6 items-center justify-center rounded-full border bg-background text-muted-foreground">
                    <AlertTriangle className="size-3.5" />
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {occurrence.date}
                    </Badge>
                    <p className="text-sm font-semibold">{occurrence.title}</p>
                    <Badge variant="secondary" className="text-[11px]">
                      {occurrence.type}
                    </Badge>
                    <Badge variant="outline" className="text-[11px]">
                      {occurrence.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {occurrence.summary}
                  </p>
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-xs text-muted-foreground">
            Nenhuma ocorrencia registrada.
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
              {editing ? "Editar ocorrencia" : "Nova ocorrencia"}
            </DialogTitle>
            <DialogDescription>
              Registre o ocorrido, etapas e desfecho.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto px-6 pb-6 pt-4">
            <OccurrenceForm
              initialValues={editing ? toFormValues(editing) : undefined}
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
