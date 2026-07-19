"use client";

import * as React from "react";
import { useAuth } from "@/features/auth/auth-context";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { SectionDialog } from "@/components/section-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  getPersonSensitiveDocuments,
  upsertPersonSensitiveDocuments,
} from "@/modules/people/api";
import type { ApiError } from "@/lib/api";
import { Copy, LockKeyhole, Save } from "lucide-react";

function safeErrorMessage(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message?: string }).message);
  }
  return fallback;
}

type FormState = {
  cpf: string;
  rg: string;
  nis: string;
  cns: string;
};

const emptyForm = (seed?: Partial<FormState>): FormState => ({
  cpf: seed?.cpf ?? "",
  rg: seed?.rg ?? "",
  nis: seed?.nis ?? "",
  cns: seed?.cns ?? "",
});

export function PersonSensitiveDocumentsDialog({
  personId,
}: {
  personId: string;
}) {
  const { token } = useAuth();
  const { permissions, refresh: refreshCurrentUser } = useCurrentUser();
  const { toast } = useToast();

  const canRead = permissions.includes("people.sensitive.read");
  const canUpdate = permissions.includes("people.sensitive.update");
  const canAccess = canRead || canUpdate;

  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<FormState>(emptyForm());

  React.useEffect(() => {
    if (open && !canAccess) setOpen(false);
  }, [open, canAccess]);

  const load = React.useCallback(async () => {
    if (!token || !canRead) return;
    setLoading(true);
    try {
      const data = await getPersonSensitiveDocuments(token, personId);
      setForm(
        emptyForm({
          cpf: data?.cpf ?? "",
          rg: data?.rg ?? "",
          nis: data?.nis ?? "",
          cns: data?.cns ?? "",
        }),
      );
    } catch (err) {
      const apiError = err as Partial<ApiError>;
      if (apiError?.status === 403) {
        toast({
          title: "Permissão negada",
          description:
            "Você não tem acesso para visualizar documentos sensíveis.",
          variant: "destructive",
        });
        setOpen(false);
        await refreshCurrentUser();
        return;
      }
      toast({
        title: "Falha ao carregar documentos",
        description: safeErrorMessage(err, "Tente novamente."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [canRead, personId, refreshCurrentUser, toast, token]);

  React.useEffect(() => {
    if (!open) return;
    load();
  }, [open, load]);

  const handleCopy = React.useCallback((value: string) => {
    if (!value) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(value);
      toast({ title: "Copiado", description: "Valor copiado para a área de transferência." });
    }
  }, [toast]);

  const handleSubmit = React.useCallback(async () => {
    if (!token || !canUpdate) return;
    setSaving(true);
    try {
      await upsertPersonSensitiveDocuments(token, personId, {
        cpf: form.cpf,
        rg: form.rg,
        nis: form.nis,
        cns: form.cns,
      });
      toast({
        title: "Documentos atualizados",
        description: "As alterações foram salvas. O acesso é auditado (LGPD).",
      });
    } catch (err) {
      const apiError = err as Partial<ApiError>;
      if (apiError?.status === 403) {
        toast({
          title: "Permissão negada",
          description: "Você não tem acesso para editar documentos sensíveis.",
          variant: "destructive",
        });
        setOpen(false);
        await refreshCurrentUser();
        return;
      }
      toast({
        title: "Falha ao salvar documentos",
        description: safeErrorMessage(err, "Verifique os dados e tente novamente."),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [canUpdate, form, personId, refreshCurrentUser, toast, token]);

  if (!canAccess) {
    return null;
  }

  return (
    <SectionDialog
      title="Documentos sensíveis"
      description="Armazenados com criptografia em repouso. Acessos são auditados (LGPD)."
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
          {canUpdate ? "Gerenciar" : "Visualizar"}
        </Button>
      }
      headerSlot={
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <LockKeyhole className="h-4 w-4" />
          Protegido
        </div>
      }
      contentClassName="max-w-[min(96vw,46rem)]"
    >
      {!canRead ? (
        <div className="rounded-xl border border-border/60 bg-muted/10 px-4 py-4 text-sm text-muted-foreground">
          Você não tem permissão para visualizar documentos sensíveis.
        </div>
      ) : (
        <div className="space-y-4">
          {loading ? (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>CPF</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={form.cpf}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, cpf: e.target.value }))
                  }
                  placeholder="Somente dígitos (11)"
                  disabled={!canUpdate}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => handleCopy(form.cpf.trim())}
                  title="Copiar CPF"
                  disabled={!form.cpf.trim()}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>RG</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={form.rg}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, rg: e.target.value }))
                  }
                  placeholder="Ex.: MG-12.345.678"
                  disabled={!canUpdate}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => handleCopy(form.rg.trim())}
                  title="Copiar RG"
                  disabled={!form.rg.trim()}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>NIS</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={form.nis}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, nis: e.target.value }))
                  }
                  placeholder="Somente dígitos (11)"
                  disabled={!canUpdate}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => handleCopy(form.nis.trim())}
                  title="Copiar NIS"
                  disabled={!form.nis.trim()}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>CNS (Cartão SUS)</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={form.cns}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, cns: e.target.value }))
                  }
                  placeholder="Somente dígitos (15)"
                  disabled={!canUpdate}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => handleCopy(form.cns.trim())}
                  title="Copiar CNS"
                  disabled={!form.cns.trim()}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canUpdate || saving}
            className="w-full"
          >
            <Save className="mr-2 h-4 w-4" />
            Salvar
          </Button>
          {!canUpdate ? (
            <p className="text-xs text-muted-foreground">
              Você não tem permissão para editar documentos sensíveis.
            </p>
          ) : null}
        </div>
      )}
    </SectionDialog>
  );
}
