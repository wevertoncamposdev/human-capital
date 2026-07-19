"use client";

import * as React from "react";
import { SectionCard } from "@/components/section-card";
import {
  FamilyMetricBadge,
  FamilyMetricField,
} from "@/modules/people/features/family-members/ui/family-metrics";
import { useFamilyRelationsContext } from "@/modules/people/features/family-members/context/family-relations-context";
import { Button } from "@/components/ui/button";
import { SectionDialog } from "@/components/section-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { publicApiRequest } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";

type HouseholdProfileForm = {
  type: string;
  condition: string;
  ownership: string;
  areaM2: string;
  rooms: string;
  bathrooms: string;
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  number: string;
  complement: string;
  reference: string;
  notes: string;
};

type CepLookupResult = {
  cep: string;
  formattedCep: string;
  street: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  ibge: string | null;
  gia: string | null;
  ddd: string | null;
  siafi: string | null;
};

const getEmptyForm = (): HouseholdProfileForm => ({
  type: "",
  condition: "",
  ownership: "",
  areaM2: "",
  rooms: "",
  bathrooms: "",
  cep: "",
  street: "",
  neighborhood: "",
  city: "",
  state: "",
  number: "",
  complement: "",
  reference: "",
  notes: "",
});

const toNumberOrNull = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatCep = (value?: string | null) => {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return value;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const buildAddressLabel = (input?: {
  street?: string | null;
  number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  cep?: string | null;
}) => {
  if (!input) return null;
  const street = input.street?.trim();
  const number = input.number?.trim();
  const neighborhood = input.neighborhood?.trim();
  const city = input.city?.trim();
  const state = input.state?.trim();
  const cep = formatCep(input.cep);

  const left = street ? `${street}${number ? `, ${number}` : ""}` : null;
  const mid =
    neighborhood || city || state
      ? [neighborhood, city && state ? `${city}/${state}` : city ?? state]
          .filter(Boolean)
          .join(" - ")
      : null;
  const parts = [left, mid, cep].filter(Boolean);
  return parts.length ? parts.join(" • ") : null;
};

type FamilyHouseholdReportProps = {
  mode?: "summary" | "detailed";
};

export function FamilyHouseholdReport({
  mode = "detailed",
}: FamilyHouseholdReportProps) {
  const { householdProfile, upsertHouseholdProfile } = useFamilyRelationsContext();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<HouseholdProfileForm>(getEmptyForm());
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isCepLoading, setIsCepLoading] = React.useState(false);
  const showActions = mode === "detailed";

  const hasProfileData = Boolean(
    householdProfile &&
      (householdProfile.type ||
        householdProfile.condition ||
        householdProfile.ownership ||
        householdProfile.areaM2 != null ||
        householdProfile.rooms != null ||
        householdProfile.bathrooms != null ||
        householdProfile.cep ||
        householdProfile.notes),
  );

  const addressLabel = React.useMemo(
    () =>
      buildAddressLabel({
        street: householdProfile?.street ?? null,
        number: householdProfile?.number ?? null,
        neighborhood: householdProfile?.neighborhood ?? null,
        city: householdProfile?.city ?? null,
        state: householdProfile?.state ?? null,
        cep: householdProfile?.cep ?? null,
      }),
    [householdProfile],
  );

  React.useEffect(() => {
    if (!open) return;
    setForm({
      type: householdProfile?.type ?? "",
      condition: householdProfile?.condition ?? "",
      ownership: householdProfile?.ownership ?? "",
      areaM2:
        householdProfile?.areaM2 != null ? String(householdProfile.areaM2) : "",
      rooms: householdProfile?.rooms != null ? String(householdProfile.rooms) : "",
      bathrooms:
        householdProfile?.bathrooms != null
          ? String(householdProfile.bathrooms)
          : "",
      cep: formatCep(householdProfile?.cep ?? null),
      street: householdProfile?.street ?? "",
      neighborhood: householdProfile?.neighborhood ?? "",
      city: householdProfile?.city ?? "",
      state: householdProfile?.state ?? "",
      number: householdProfile?.number ?? "",
      complement: householdProfile?.complement ?? "",
      reference: householdProfile?.reference ?? "",
      notes: householdProfile?.notes ?? "",
    });
  }, [open, householdProfile]);

  const fetchCep = React.useCallback(
    async (cepInput: string) => {
      const digits = cepInput.replace(/\D/g, "");
      if (digits.length !== 8) {
        if (cepInput.trim()) {
          toast({
            variant: "destructive",
            title: "CEP",
            description: "Informe um CEP válido (8 dígitos).",
          });
        }
        return;
      }

      setIsCepLoading(true);
      try {
        const data = await publicApiRequest<CepLookupResult>(`/cep/${digits}`, {
          cache: "no-store",
        });
        setForm((prev) => ({
          ...prev,
          cep: data.formattedCep,
          street: data.street ?? "",
          neighborhood: data.neighborhood ?? "",
          city: data.city ?? "",
          state: data.state ?? "",
        }));
      } catch (err) {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message)
            : "Falha ao validar CEP.";
        toast({ variant: "destructive", title: "CEP", description: message });
      } finally {
        setIsCepLoading(false);
      }
    },
    [toast],
  );

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await upsertHouseholdProfile({
      type: form.type.trim() || null,
      condition: form.condition.trim() || null,
      ownership: form.ownership.trim() || null,
      areaM2: toNumberOrNull(form.areaM2),
      rooms: toNumberOrNull(form.rooms),
      bathrooms: toNumberOrNull(form.bathrooms),
      cep: form.cep.trim() || null,
      number: form.number.trim() || null,
      complement: form.complement.trim() || null,
      reference: form.reference.trim() || null,
      notes: form.notes.trim() || null,
    });
    setIsSubmitting(false);
    setOpen(false);
  };

  const summaryBadges = [
    { label: "Tipo", value: householdProfile?.type },
    { label: "Condição", value: householdProfile?.condition },
    { label: "Propriedade", value: householdProfile?.ownership },
  ].filter((item) => Boolean(item.value));

  return (
    <SectionCard
      title="Relatório de moradia"
      subtitle="Características da residência monitorada"
      collapsible={showActions}
      defaultOpen
      actions={
        showActions ? (
          <SectionDialog
            title="Editar moradia"
            description="Atualize as informações da residência."
            open={open}
            onOpenChange={setOpen}
            trigger={
              <Button size="sm" variant="outline">
                {hasProfileData ? "Editar" : "Adicionar"}
              </Button>
            }
          >
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>CEP</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.cep}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        cep: event.target.value,
                        street: "",
                        neighborhood: "",
                        city: "",
                        state: "",
                      }))
                    }
                    onBlur={() => fetchCep(form.cep)}
                    placeholder="00000-000"
                    inputMode="numeric"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isCepLoading}
                    onClick={() => fetchCep(form.cep)}
                  >
                    {isCepLoading ? "Buscando..." : "Buscar"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Preencha o CEP para validar e completar o endereço.
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Logradouro</Label>
                <Input value={form.street} readOnly placeholder="Rua/Avenida" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Número</Label>
                  <Input
                    value={form.number}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, number: event.target.value }))
                    }
                    placeholder="123"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Complemento</Label>
                  <Input
                    value={form.complement}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        complement: event.target.value,
                      }))
                    }
                    placeholder="Apto, casa, bloco..."
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label>Bairro</Label>
                  <Input value={form.neighborhood} readOnly />
                </div>
                <div className="grid gap-2">
                  <Label>Cidade</Label>
                  <Input value={form.city} readOnly />
                </div>
                <div className="grid gap-2">
                  <Label>UF</Label>
                  <Input value={form.state} readOnly />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Referência</Label>
                <Input
                  value={form.reference}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      reference: event.target.value,
                    }))
                  }
                  placeholder="Ponto de referência, observações do local..."
                />
              </div>

              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Input
                  value={form.type}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, type: event.target.value }))
                  }
                  placeholder="Casa, apartamento, quarto..."
                />
              </div>
              <div className="grid gap-2">
                <Label>Condição</Label>
                <Input
                  value={form.condition}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, condition: event.target.value }))
                  }
                  placeholder="Boa, regular, precisa de reforma..."
                />
              </div>
              <div className="grid gap-2">
                <Label>Propriedade</Label>
                <Input
                  value={form.ownership}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, ownership: event.target.value }))
                  }
                  placeholder="Própria, alugada, cedida..."
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label>Área (m²)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.areaM2}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, areaM2: event.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Cômodos</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={form.rooms}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, rooms: event.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Banheiros</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={form.bathrooms}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        bathrooms: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Observações</Label>
                <Textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </SectionDialog>
        ) : undefined
      }
    >
      {summaryBadges.length ? (
        <div className="flex flex-wrap items-center gap-2">
          {summaryBadges.map((item) => (
            <FamilyMetricBadge
              key={item.label}
              label={item.label}
              value={item.value ?? "-"}
            />
          ))}
        </div>
      ) : null}

      {addressLabel ? (
        <p className="text-xs text-muted-foreground">{addressLabel}</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <FamilyMetricField
          label="Área (m²)"
          value={householdProfile?.areaM2 != null ? String(householdProfile.areaM2) : "-"}
        />
        <FamilyMetricField
          label="Cômodos"
          value={householdProfile?.rooms != null ? String(householdProfile.rooms) : "-"}
        />
        <FamilyMetricField
          label="Banheiros"
          value={
            householdProfile?.bathrooms != null
              ? String(householdProfile.bathrooms)
              : "-"
          }
        />
      </div>

      {householdProfile?.notes && showActions ? (
        <p className="text-xs text-muted-foreground">{householdProfile.notes}</p>
      ) : null}

      {!hasProfileData ? (
        <p className="text-xs text-muted-foreground">
          Nenhuma informação de moradia cadastrada.
        </p>
      ) : null}
    </SectionCard>
  );
}
