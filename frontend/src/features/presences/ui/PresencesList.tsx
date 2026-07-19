"use client";

import * as React from "react";
import type { Presence } from "@/features/presences/domain/types";
import { PresenceForm } from "@/features/presences/ui/PresenceForm";
import {
  createPresence,
  deletePresence,
  getPresencesByPersonId,
  updatePresence,
} from "@/features/presences/data/presences-service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type PresencesListProps = {
  peopleId: string;
};

export function PresencesList({ peopleId }: PresencesListProps) {
  const [items, setItems] = React.useState<Presence[]>([]);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Presence | null>(null);
  const [presenceRange, setPresenceRange] = React.useState({
    start: "",
    end: "",
  });

  const loadItems = React.useCallback(async () => {
    const data = await getPresencesByPersonId(peopleId);
    setItems(data);
  }, [peopleId]);

  React.useEffect(() => {
    loadItems();
  }, [loadItems]);

  const filteredPresences = React.useMemo(() => {
    const { start, end } = presenceRange;
    return items.filter((entry) => {
      if (start && entry.date < start) return false;
      if (end && entry.date > end) return false;
      return true;
    });
  }, [items, presenceRange]);

  const totalPresences = filteredPresences.length;
  const totalPresent = filteredPresences.filter(
    (entry) => entry.status === "Presenca",
  ).length;
  const totalAbsent = filteredPresences.filter(
    (entry) => entry.status === "Falta",
  ).length;
  const presencePercent =
    totalPresences === 0 ? 0 : Math.round((totalPresent / totalPresences) * 100);

  const handleSave = async (data: Omit<Presence, "id">) => {
    if (editing) {
      await updatePresence(peopleId, editing.id, data);
    } else {
      await createPresence(peopleId, data);
    }
    await loadItems();
    setOpen(false);
    setEditing(null);
  };

  const handleEdit = (item: Presence) => {
    setEditing(item);
    setOpen(true);
  };

  const handleRemove = async (item: Presence) => {
    await deletePresence(peopleId, item.id);
    await loadItems();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Presencas</CardTitle>
            <CardDescription>
              Resumo por periodo e historico de presencas.
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            Registrar presenca
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded-md border border-border/40 bg-card/50 px-2.5 py-1.5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Presencas
              </p>
              <p className="text-base font-semibold text-foreground">
                {totalPresent}
              </p>
            </div>
            <div className="rounded-md border border-border/40 bg-card/50 px-2.5 py-1.5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Faltas
              </p>
              <p className="text-base font-semibold text-foreground">
                {totalAbsent}
              </p>
            </div>
            <div className="rounded-md border border-border/40 bg-card/50 px-2.5 py-1.5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                Frequencia
              </p>
              <p className="text-base font-semibold text-foreground">
                {presencePercent}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-col items-start gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Historico</CardTitle>
            <CardDescription>Lista de presencas por dia.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              className="h-8 text-xs w-[140px]"
              value={presenceRange.start}
              onChange={(event) =>
                setPresenceRange((prev) => ({
                  ...prev,
                  start: event.target.value,
                }))
              }
            />
            <Input
              type="date"
              className="h-8 text-xs w-[140px]"
              value={presenceRange.end}
              onChange={(event) =>
                setPresenceRange((prev) => ({
                  ...prev,
                  end: event.target.value,
                }))
              }
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredPresences.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 text-left font-medium">Data</th>
                    <th className="py-2 text-left font-medium">Status</th>
                    <th className="py-2 text-right font-medium">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPresences.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0">
                      <td className="py-2">{entry.date}</td>
                      <td className="py-2">
                        <Badge
                          variant={
                            entry.status === "Presenca" ? "default" : "secondary"
                          }
                          className="text-[11px]"
                        >
                          {entry.status}
                        </Badge>
                      </td>
                      <td className="py-2 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(entry)}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemove(entry)}
                          >
                            Remover
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nenhuma presenca registrada no periodo.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setEditing(null);
        }}
      >
        <DialogContent className="w-[94vw] max-w-3xl p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>
              {editing ? "Editar presenca" : "Registrar presenca"}
            </DialogTitle>
            <DialogDescription>Atualize o status da presenca.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto px-6 pb-6 pt-4">
            <PresenceForm
              initialValues={editing ?? undefined}
              onSubmit={handleSave}
              onCancel={() => setOpen(false)}
              submitLabel={editing ? "Salvar" : "Adicionar"}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
