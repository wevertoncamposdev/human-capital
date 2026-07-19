"use client";

import * as React from "react";
import type { Contact, ContactFormData } from "@/features/contacts/domain/types";
import { ContactForm } from "@/features/contacts/ui/ContactForm";
import {
  createContact,
  deleteContact,
  getContactsByPersonId,
  updateContact,
} from "@/features/contacts/data/contacts-service";
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

type ContactsListProps = {
  peopleId: string;
};

export function ContactsList({ peopleId }: ContactsListProps) {
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Contact | null>(null);

  const loadContacts = React.useCallback(async () => {
    const data = await getContactsByPersonId(peopleId);
    setContacts(data);
  }, [peopleId]);

  React.useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const handleSave = async (data: ContactFormData) => {
    if (editing) {
      await updateContact(peopleId, editing.id, data);
    } else {
      await createContact(peopleId, data);
    }
    await loadContacts();
    setOpen(false);
    setEditing(null);
  };

  const handleEdit = (contact: Contact) => {
    setEditing(contact);
    setOpen(true);
  };

  const handleRemove = async (contact: Contact) => {
    await deleteContact(peopleId, contact.id);
    await loadContacts();
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Contatos</CardTitle>
          <CardDescription>
            Adicione contatos de emergencia, familiares ou responsaveis.
          </CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Adicionar contato
        </Button>
      </CardHeader>
      <CardContent>
        {contacts.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Nenhum contato cadastrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 text-left font-medium">Nome</th>
                  <th className="py-2 text-left font-medium">Relacao</th>
                  <th className="py-2 text-left font-medium">Telefone</th>
                  <th className="py-2 text-left font-medium">Email</th>
                  <th className="py-2 text-left font-medium">Principal</th>
                  <th className="py-2 text-right font-medium">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id} className="border-b last:border-0">
                    <td className="py-2">{contact.name}</td>
                    <td className="py-2">{contact.relationship || "-"}</td>
                    <td className="py-2">{contact.phone || "-"}</td>
                    <td className="py-2">{contact.email || "-"}</td>
                    <td className="py-2">
                      {contact.isPrimary ? (
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
                          onClick={() => handleEdit(contact)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemove(contact)}
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
              {editing ? "Editar contato" : "Novo contato"}
            </DialogTitle>
            <DialogDescription>Preencha as informacoes do contato.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[80vh] overflow-y-auto px-6 pb-6 pt-4">
            <ContactForm
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
