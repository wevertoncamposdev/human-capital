"use client";

import * as React from "react";
import type { Address } from "@/features/addresses/domain/types";
import { AddressForm } from "@/features/addresses/ui/AddressForm";
import {
  createAddress,
  deleteAddress,
  getAddressesByPersonId,
  updateAddress,
} from "@/features/addresses/data/addresses-service";
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

type AddressesListProps = {
  peopleId: string;
};

export function AddressesList({ peopleId }: AddressesListProps) {
  const [items, setItems] = React.useState<Address[]>([]);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Address | null>(null);

  const loadItems = React.useCallback(async () => {
    const data = await getAddressesByPersonId(peopleId);
    setItems(data);
  }, [peopleId]);

  React.useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleSave = async (data: Omit<Address, "id">) => {
    if (editing) {
      await updateAddress(peopleId, editing.id, data);
    } else {
      await createAddress(peopleId, data);
    }
    await loadItems();
    setOpen(false);
    setEditing(null);
  };

  const handleEdit = (item: Address) => {
    setEditing(item);
    setOpen(true);
  };

  const handleRemove = async (item: Address) => {
    await deleteAddress(peopleId, item.id);
    await loadItems();
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Enderecos</CardTitle>
          <CardDescription>Endereco atual e historico.</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Adicionar endereco
        </Button>
      </CardHeader>
      <CardContent>
        {items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 text-left font-medium">Nome</th>
                  <th className="py-2 text-left font-medium">Endereco</th>
                  <th className="py-2 text-left font-medium">Cidade</th>
                  <th className="py-2 text-left font-medium">Estado</th>
                  <th className="py-2 text-left font-medium">Principal</th>
                  <th className="py-2 text-right font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((address) => (
                  <tr key={address.id} className="border-b last:border-0">
                    <td className="py-2">{address.label}</td>
                    <td className="py-2">
                      {address.street}, {address.number}{" "}
                      {address.complement ? `- ${address.complement}` : ""}
                    </td>
                    <td className="py-2">{address.city}</td>
                    <td className="py-2">{address.state}</td>
                    <td className="py-2">
                      {address.isPrimary ? (
                        <Badge variant="secondary">Principal</Badge>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-2 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(address)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemove(address)}
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
            Nenhum endereco registrado.
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
              {editing ? "Editar endereco" : "Adicionar endereco"}
            </DialogTitle>
            <DialogDescription>Preencha os dados do endereco.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto px-6 pb-6 pt-4">
            <AddressForm
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
