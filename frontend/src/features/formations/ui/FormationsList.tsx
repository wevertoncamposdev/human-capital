"use client";

import * as React from "react";
import type { Formation } from "@/features/formations/domain/types";
import { FormationForm } from "@/features/formations/ui/FormationForm";
import type { FormationFormValues } from "@/features/formations/config/formation-form-config";
import {
  createFormation,
  deleteFormation,
  getFormationsByPersonId,
  updateFormation,
} from "@/features/formations/data/formations-service";
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

type FormationsListProps = {
  peopleId: string;
};

const toFormValues = (formation: Formation): FormationFormValues => ({
  institution: formation.institution,
  course: formation.course,
  level: formation.level,
  status: formation.status,
  periodStart: formation.period.start,
  periodEnd: formation.period.end,
});

const fromFormValues = (values: FormationFormValues) => ({
  institution: values.institution,
  course: values.course,
  level: values.level,
  status: values.status,
  period: { start: values.periodStart, end: values.periodEnd },
});

export function FormationsList({ peopleId }: FormationsListProps) {
  const [items, setItems] = React.useState<Formation[]>([]);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Formation | null>(null);

  const loadItems = React.useCallback(async () => {
    const data = await getFormationsByPersonId(peopleId);
    setItems(data);
  }, [peopleId]);

  React.useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleSave = async (values: FormationFormValues) => {
    const payload = fromFormValues(values);
    if (editing) {
      await updateFormation(peopleId, editing.id, payload);
    } else {
      await createFormation(peopleId, payload);
    }
    await loadItems();
    setOpen(false);
    setEditing(null);
  };

  const handleEdit = (item: Formation) => {
    setEditing(item);
    setOpen(true);
  };

  const handleRemove = async (item: Formation) => {
    await deleteFormation(peopleId, item.id);
    await loadItems();
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Formacao</CardTitle>
          <CardDescription>
            Cursos, escolas, faculdades e formacoes.
          </CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Adicionar formacao
        </Button>
      </CardHeader>
      <CardContent>
        {items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 text-left font-medium">Instituicao</th>
                  <th className="py-2 text-left font-medium">Curso</th>
                  <th className="py-2 text-left font-medium">Nivel</th>
                  <th className="py-2 text-left font-medium">Status</th>
                  <th className="py-2 text-left font-medium">Periodo</th>
                  <th className="py-2 text-right font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((formation) => (
                  <tr key={formation.id} className="border-b last:border-0">
                    <td className="py-2">{formation.institution}</td>
                    <td className="py-2">{formation.course}</td>
                    <td className="py-2">{formation.level}</td>
                    <td className="py-2">{formation.status}</td>
                    <td className="py-2">
                      {formation.period.start || "-"} /{" "}
                      {formation.period.end || "Atual"}
                    </td>
                    <td className="py-2 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(formation)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemove(formation)}
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
            Nenhuma formacao cadastrada.
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
              {editing ? "Editar formacao" : "Adicionar formacao"}
            </DialogTitle>
            <DialogDescription>
              Registre a formacao academica ou profissional.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto px-6 pb-6 pt-4">
            <FormationForm
              initialValues={editing ? toFormValues(editing) : undefined}
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
