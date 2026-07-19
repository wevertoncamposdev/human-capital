"use client";

import * as React from "react";
import type { Activity } from "@/features/activities/domain/types";
import { ActivityForm } from "@/features/activities/ui/ActivityForm";
import {
  createActivity,
  deleteActivity,
  getActivitiesByPersonId,
  updateActivity,
} from "@/features/activities/data/activities-service";
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

type ActivitiesListProps = {
  peopleId: string;
};

export function ActivitiesList({ peopleId }: ActivitiesListProps) {
  const [items, setItems] = React.useState<Activity[]>([]);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Activity | null>(null);

  const loadItems = React.useCallback(async () => {
    const data = await getActivitiesByPersonId(peopleId);
    setItems(data);
  }, [peopleId]);

  React.useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleSave = async (data: Omit<Activity, "id">) => {
    if (editing) {
      await updateActivity(peopleId, editing.id, data);
    } else {
      await createActivity(peopleId, data);
    }
    await loadItems();
    setOpen(false);
    setEditing(null);
  };

  const handleEdit = (item: Activity) => {
    setEditing(item);
    setOpen(true);
  };

  const handleRemove = async (item: Activity) => {
    await deleteActivity(peopleId, item.id);
    await loadItems();
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Atividades</CardTitle>
          <CardDescription>Participacoes e atividades.</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Nova atividade
        </Button>
      </CardHeader>
      <CardContent>
        {items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 text-left font-medium">Atividade</th>
                  <th className="py-2 text-left font-medium">Data</th>
                  <th className="py-2 text-left font-medium">Status</th>
                  <th className="py-2 text-right font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((activity) => (
                  <tr key={activity.id} className="border-b last:border-0">
                    <td className="py-2">{activity.title}</td>
                    <td className="py-2">{activity.date}</td>
                    <td className="py-2">
                      <Badge
                        variant={
                          activity.status === "Concluida"
                            ? "default"
                            : activity.status === "Cancelada"
                              ? "secondary"
                              : "outline"
                        }
                        className="text-[11px]"
                      >
                        {activity.status}
                      </Badge>
                    </td>
                    <td className="py-2 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(activity)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemove(activity)}
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
            Nenhuma atividade registrada.
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
              {editing ? "Editar atividade" : "Nova atividade"}
            </DialogTitle>
            <DialogDescription>
              Registre a atividade e o status.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto px-6 pb-6 pt-4">
            <ActivityForm
              initialValues={editing ?? undefined}
              onSubmit={handleSave}
              onCancel={() => setOpen(false)}
              submitLabel={editing ? "Salvar" : "Adicionar"}
            />
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
