"use client";

import * as React from "react";
import type { SchoolHistory } from "@/features/school-histories/domain/types";
import { SchoolHistoryForm } from "@/features/school-histories/ui/SchoolHistoryForm";
import {
  createSchoolHistory,
  deleteSchoolHistory,
  getSchoolHistoriesByPersonId,
  updateSchoolHistory,
} from "@/features/school-histories/data/school-histories-service";
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

type SchoolHistoriesListProps = {
  peopleId: string;
};

export function SchoolHistoriesList({ peopleId }: SchoolHistoriesListProps) {
  const [items, setItems] = React.useState<SchoolHistory[]>([]);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SchoolHistory | null>(null);

  const loadItems = React.useCallback(async () => {
    const data = await getSchoolHistoriesByPersonId(peopleId);
    setItems(data);
  }, [peopleId]);

  React.useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleSave = async (data: Omit<SchoolHistory, "id">) => {
    if (editing) {
      await updateSchoolHistory(peopleId, editing.id, data);
    } else {
      await createSchoolHistory(peopleId, data);
    }
    await loadItems();
    setOpen(false);
    setEditing(null);
  };

  const handleEdit = (item: SchoolHistory) => {
    setEditing(item);
    setOpen(true);
  };

  const handleRemove = async (item: SchoolHistory) => {
    await deleteSchoolHistory(peopleId, item.id);
    await loadItems();
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Escolar</CardTitle>
          <CardDescription>
            Historico anual de escola e serie atual.
          </CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Adicionar ano
        </Button>
      </CardHeader>
      <CardContent>
        {items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 text-left font-medium">Ano</th>
                  <th className="py-2 text-left font-medium">Escola</th>
                  <th className="py-2 text-left font-medium">Serie</th>
                  <th className="py-2 text-left font-medium">Turno</th>
                  <th className="py-2 text-left font-medium">Atual</th>
                  <th className="py-2 text-right font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-0">
                    <td className="py-2">{entry.year}</td>
                    <td className="py-2">{entry.school}</td>
                    <td className="py-2">{entry.grade}</td>
                    <td className="py-2">{entry.shift}</td>
                    <td className="py-2">
                      {entry.isCurrent ? (
                        <Badge variant="secondary">Atual</Badge>
                      ) : (
                        "-"
                      )}
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
            Nenhum ano escolar cadastrado.
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
        <DialogContent className="w-[94vw] max-w-3xl p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>
              {editing ? "Editar ano escolar" : "Adicionar ano"}
            </DialogTitle>
            <DialogDescription>
              Registre escola, serie e turno.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto px-6 pb-6 pt-4">
            <SchoolHistoryForm
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
