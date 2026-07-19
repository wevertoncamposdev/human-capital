"use client";

import * as React from "react";
import {
  createPersonContact,
  deletePersonContact,
  listPersonContacts,
  updatePersonContact,
  type ApiPersonContact,
  type ApiPersonContactRole,
  type ApiPersonContactType,
} from "@/modules/people/api";
import { useAuth } from "@/features/auth/auth-context";
import { useToast } from "@/components/ui/use-toast";
import { SectionDialog } from "@/components/section-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";

const ROLE_OPTIONS: { value: ApiPersonContactRole; label: string }[] = [
  { value: "SELF", label: "Pessoal" },
  { value: "RESPONSIBLE", label: "Responsável" },
  { value: "EMERGENCY", label: "Emergência" },
];

const TYPE_OPTIONS: { value: ApiPersonContactType; label: string }[] = [
  { value: "PHONE", label: "Telefone" },
  { value: "EMAIL", label: "E-mail" },
];

function contactTitle(contact: ApiPersonContact) {
  const role =
    ROLE_OPTIONS.find((item) => item.value === contact.role)?.label ??
    contact.role;
  const type =
    TYPE_OPTIONS.find((item) => item.value === contact.type)?.label ??
    contact.type;
  const who =
    contact.role === "SELF"
      ? null
      : contact.name
        ? contact.name
        : "Contato";
  return [type, role, who].filter(Boolean).join(" • ");
}

function safeErrorMessage(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message?: string }).message);
  }
  return fallback;
}

type FormState = {
  role: ApiPersonContactRole;
  type: ApiPersonContactType;
  value: string;
  label: string;
  name: string;
  relationship: string;
  isPrimary: boolean;
  isWhatsapp: boolean;
  notes: string;
};

const emptyForm = (seed?: Partial<FormState>): FormState => ({
  role: seed?.role ?? "SELF",
  type: seed?.type ?? "PHONE",
  value: seed?.value ?? "",
  label: seed?.label ?? "",
  name: seed?.name ?? "",
  relationship: seed?.relationship ?? "",
  isPrimary: seed?.isPrimary ?? false,
  isWhatsapp: seed?.isWhatsapp ?? false,
  notes: seed?.notes ?? "",
});

export function PersonContactsDialog({
  personId,
  seedEmail,
  seedPhone,
  onChanged,
}: {
  personId: string;
  seedEmail?: string | null;
  seedPhone?: string | null;
  onChanged?: () => void;
}) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [contacts, setContacts] = React.useState<ApiPersonContact[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [editing, setEditing] = React.useState<ApiPersonContact | null>(null);
  const [form, setForm] = React.useState<FormState>(emptyForm());

  const load = React.useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await listPersonContacts(token, personId);
      setContacts(data);
    } catch (err) {
      toast({
        title: "Falha ao carregar contatos",
        description: safeErrorMessage(err, "Tente novamente."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [personId, toast, token]);

  React.useEffect(() => {
    if (!open) return;
    load();
  }, [open, load]);

  const resetForm = React.useCallback(() => {
    setEditing(null);
    setForm(emptyForm());
  }, []);

  const handleCopy = React.useCallback((value: string) => {
    if (!value) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(value);
    }
  }, []);

  const handleSeed = React.useCallback(
    (payload: { type: ApiPersonContactType; value: string }) => {
      setEditing(null);
      setForm(
        emptyForm({
          role: "SELF",
          type: payload.type,
          value: payload.value,
          isPrimary: true,
          isWhatsapp: payload.type === "PHONE",
        }),
      );
    },
    [],
  );

  const handleEdit = React.useCallback((contact: ApiPersonContact) => {
    setEditing(contact);
    setForm(
      emptyForm({
        role: contact.role,
        type: contact.type,
        value: contact.value,
        label: contact.label ?? "",
        name: contact.name ?? "",
        relationship: contact.relationship ?? "",
        isPrimary: contact.isPrimary,
        isWhatsapp: contact.isWhatsapp,
        notes: contact.notes ?? "",
      }),
    );
  }, []);

  const handleDelete = React.useCallback(
    async (contact: ApiPersonContact) => {
      if (!token) return;
      const ok = window.confirm("Remover este contato?");
      if (!ok) return;
      setSaving(true);
      try {
        await deletePersonContact(token, personId, contact.id);
        if (editing?.id === contact.id) {
          resetForm();
        }
        await load();
        onChanged?.();
      } catch (err) {
        toast({
          title: "Falha ao remover contato",
          description: safeErrorMessage(err, "Tente novamente."),
          variant: "destructive",
        });
      } finally {
        setSaving(false);
      }
    },
    [editing?.id, load, onChanged, personId, resetForm, toast, token],
  );

  const handleSubmit = React.useCallback(async () => {
    if (!token) return;
    const value = form.value.trim();
    if (!value) {
      toast({
        title: "Preencha o valor",
        description: "Informe um e-mail ou telefone.",
        variant: "destructive",
      });
      return;
    }
    if (form.role !== "SELF" && !form.name.trim()) {
      toast({
        title: "Preencha o nome",
        description: "Informe o nome do contato.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        role: form.role,
        type: form.type,
        value,
        label: form.label.trim() || null,
        name: form.role === "SELF" ? null : form.name.trim() || null,
        relationship: form.relationship.trim() || null,
        isPrimary: form.isPrimary,
        isWhatsapp: form.type === "PHONE" ? form.isWhatsapp : false,
        notes: form.notes.trim() || null,
      };

      if (editing) {
        await updatePersonContact(token, personId, editing.id, payload);
      } else {
        await createPersonContact(token, personId, payload);
      }
      await load();
      resetForm();
      onChanged?.();
      toast({
        title: "Contato salvo",
        description: "As informações foram atualizadas.",
      });
    } catch (err) {
      toast({
        title: "Falha ao salvar contato",
        description: safeErrorMessage(err, "Verifique os dados e tente novamente."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [editing, form, load, onChanged, personId, resetForm, toast, token]);

  const showNameFields = form.role !== "SELF";
  const showWhatsapp = form.type === "PHONE";

  return (
    <SectionDialog
      title="Contatos"
      description="Telefones, e-mails e contatos de emergência/responsáveis."
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
      trigger={
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
          Gerenciar
        </Button>
      }
    >
      <div className="space-y-3">
        {(seedEmail || seedPhone) && !contacts.length ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/10 px-3 py-2 text-xs">
            <span className="text-muted-foreground">
              Importar do cadastro:
            </span>
            {seedPhone ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => handleSeed({ type: "PHONE", value: seedPhone })}
              >
                Telefone
              </Button>
            ) : null}
            {seedEmail ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => handleSeed({ type: "EMAIL", value: seedEmail })}
              >
                E-mail
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-2xl border border-border/60 bg-background px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">
              {editing ? "Editar contato" : "Novo contato"}
            </p>
            {editing ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={resetForm}
              >
                Cancelar
              </Button>
            ) : null}
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    type: value as ApiPersonContactType,
                    isWhatsapp:
                      value === "PHONE" ? prev.isWhatsapp : false,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select
                value={form.role}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    role: value as ApiPersonContactRole,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label>Valor</Label>
              <Input
                value={form.value}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, value: e.target.value }))
                }
                placeholder={form.type === "EMAIL" ? "email@exemplo.com" : "(11) 99999-9999"}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Rótulo (opcional)</Label>
              <Input
                value={form.label}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, label: e.target.value }))
                }
                placeholder="Ex.: Trabalho, Recados..."
              />
            </div>

            {showNameFields ? (
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Ex.: Maria da Silva"
                />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Parentesco (opcional)</Label>
                <Input
                  value={form.relationship}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      relationship: e.target.value,
                    }))
                  }
                  placeholder="Ex.: Mãe, Pai..."
                />
              </div>
            )}

            {showNameFields ? (
              <div className="space-y-1.5 md:col-span-2">
                <Label>Parentesco (opcional)</Label>
                <Input
                  value={form.relationship}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      relationship: e.target.value,
                    }))
                  }
                  placeholder="Ex.: Mãe, Pai..."
                />
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-4 md:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.isPrimary}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      isPrimary: Boolean(checked),
                    }))
                  }
                />
                Principal
              </label>
              {showWhatsapp ? (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.isWhatsapp}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({
                        ...prev,
                        isWhatsapp: Boolean(checked),
                      }))
                    }
                  />
                  WhatsApp
                </label>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                {editing ? "Salvar alterações" : "Adicionar contato"}
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-background px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold">Lista</p>
            {loading ? (
              <span className="text-xs text-muted-foreground">
                Carregando...
              </span>
            ) : null}
          </div>

          {!loading && !contacts.length ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhum contato cadastrado.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/5 px-3 py-2"
                >
                  <div className="min-w-[220px] space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold">
                        {contactTitle(contact)}
                      </span>
                      {contact.isPrimary ? (
                        <Badge variant="secondary">Principal</Badge>
                      ) : null}
                      {contact.type === "PHONE" && contact.isWhatsapp ? (
                        <Badge variant="outline">WhatsApp</Badge>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {contact.label ? `${contact.label} • ` : null}
                      {contact.value}
                      {contact.relationship ? ` • ${contact.relationship}` : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleCopy(contact.value)}
                      title="Copiar"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(contact)}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(contact)}
                      disabled={saving}
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SectionDialog>
  );
}
