"use client";

import * as React from "react";
import type { IncomeProfile } from "@/features/incomes/domain/types";
import { IncomeForm } from "@/features/incomes/ui/IncomeForm";
import {
  createIncomeProfile,
  deleteIncomeProfile,
  getIncomeProfilesByPersonId,
  updateIncomeProfile,
} from "@/features/incomes/data/incomes-service";
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
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/modules/people/shared/domain/utils";

type IncomesListProps = {
  peopleId: string;
};

export function IncomesList({ peopleId }: IncomesListProps) {
  const [items, setItems] = React.useState<IncomeProfile[]>([]);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<IncomeProfile | null>(null);

  const loadItems = React.useCallback(async () => {
    const data = await getIncomeProfilesByPersonId(peopleId);
    setItems(data);
  }, [peopleId]);

  React.useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleSave = async (data: Omit<IncomeProfile, "id">) => {
    if (editing) {
      await updateIncomeProfile(peopleId, editing.id, data);
    } else {
      await createIncomeProfile(peopleId, data);
    }
    await loadItems();
    setOpen(false);
    setEditing(null);
  };

  const handleEdit = (item: IncomeProfile) => {
    setEditing(item);
    setOpen(true);
  };

  const handleRemove = async (item: IncomeProfile) => {
    await deleteIncomeProfile(peopleId, item.id);
    await loadItems();
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Renda</CardTitle>
          <CardDescription>Fontes e condicao de trabalho.</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Adicionar renda
        </Button>
      </CardHeader>
      <CardContent>
        {items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 text-left font-medium">Renda</th>
                  <th className="py-2 text-left font-medium">Outras rendas</th>
                  <th className="py-2 text-left font-medium">Beneficios</th>
                  <th className="py-2 text-left font-medium">Situacao</th>
                  <th className="py-2 text-left font-medium">Periodo</th>
                  <th className="py-2 text-right font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((income) => (
                  <tr key={income.id} className="border-b last:border-0">
                    <td className="py-2">{formatCurrency(income.income)}</td>
                    <td className="py-2">
                      {formatCurrency(income.otherIncome)}
                    </td>
                    <td className="py-2">
                      {income.benefits.length ? (
                        <div className="flex flex-wrap gap-1">
                          {income.benefits.map((benefit) => (
                            <Badge key={benefit} variant="secondary">
                              {benefit}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-2">{income.employmentStatus}</td>
                    <td className="py-2">
                      {income.employmentPeriod.start || "-"} /{" "}
                      {income.employmentPeriod.end || "Atual"}
                    </td>
                    <td className="py-2 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(income)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemove(income)}
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
            Nenhuma informacao de renda registrada.
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
              {editing ? "Editar renda" : "Adicionar renda"}
            </DialogTitle>
            <DialogDescription>
              Atualize as informacoes de renda e trabalho.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto px-6 pb-6 pt-4">
            <IncomeForm
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



