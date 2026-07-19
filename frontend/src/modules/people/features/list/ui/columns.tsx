"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TagInput } from "@/components/ui/tag-input";
import { PersonIdentityAvatarTrigger } from "@/modules/people/shared/ui/person-identity-card";
import type { PeopleTableItem, PersonFormData } from "@/modules/people/shared/domain/types";
import {
  formatDate,
  GENDER_LABELS,
  RACE_COLOR_LABELS,
  SEX_LABELS,
  resolvePersonDisplayNames,
  resolveLabel,
} from "@/modules/people/shared/domain/utils";
import { usePathname } from "next/navigation";
import { getTenantSlugFromPath } from "@/lib/tenant-path";

const getStatusVariant = (status?: PeopleTableItem["status"]) => {
  if (status === "Ativo") return "default";
  if (status === "Desligado") return "destructive";
  if (status === "Inativo") return "secondary";
  return "outline";
};

type PeopleColumnsProps = {
  onInlineUpdate?: (
    personId: string,
    patch: Partial<Omit<PersonFormData, "avatarUrl">>,
  ) => Promise<void> | void;
  updatingIds?: Set<string>;
  tagSuggestions?: string[];
};

const badgeTone = {
  blue: "border-blue-200 bg-blue-50 text-blue-700",
  rose: "border-rose-200 bg-rose-50 text-rose-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  teal: "border-teal-200 bg-teal-50 text-teal-700",
  violet: "border-violet-200 bg-violet-50 text-violet-700",
  slate: "border-slate-200 bg-slate-50 text-slate-600",
  brown: "border-amber-900/30 bg-amber-900/10 text-amber-900",
};

const sexBadgeClass: Record<string, string> = {
  Masculino: badgeTone.blue,
  Feminino: badgeTone.rose,
  Intersexo: badgeTone.amber,
  "Nao informado": badgeTone.slate,
};

const genderBadgeClass: Record<string, string> = {
  Homem: badgeTone.blue,
  Mulher: badgeTone.rose,
  "Nao binario": badgeTone.violet,
  "Genero fluido": badgeTone.teal,
  Agenero: badgeTone.slate,
  Outro: badgeTone.amber,
  "Prefiro nao informar": badgeTone.slate,
};

const raceBadgeClass: Record<string, string> = {
  Branca: badgeTone.slate,
  Preta: badgeTone.brown,
  Parda: badgeTone.amber,
  Amarela: badgeTone.amber,
  Indigena: badgeTone.teal,
  "Prefiro nao informar": badgeTone.slate,
};

function TagsCell({
  person,
  onSave,
  disabled,
  suggestions,
}: {
  person: PeopleTableItem;
  onSave?: (tags: string[]) => void;
  disabled?: boolean;
  suggestions?: string[];
}) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<string[]>(person.tags ?? []);

  React.useEffect(() => {
    setDraft(person.tags ?? []);
  }, [person.tags]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          disabled={disabled}
          aria-label="Adicionar tag"
        >
          <Plus className="size-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar tags</DialogTitle>
          <DialogDescription>
            Use tags para organizar e filtrar pessoas.
          </DialogDescription>
        </DialogHeader>
        <TagInput value={draft} onChange={setDraft} suggestions={suggestions} />
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              onSave?.(draft);
              setOpen(false);
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function usePeopleColumns({
  onInlineUpdate,
  updatingIds,
  tagSuggestions,
}: PeopleColumnsProps = {}) {
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const columns: ColumnDef<PeopleTableItem>[] = [
    {
      accessorKey: "fullName",
      header: "Pessoa",
      meta: { dataType: "string" },
      cell: ({ row }) => {
        const person = row.original;
        const displayNames = resolvePersonDisplayNames(
          person.fullName,
          person.socialName,
        );
        return (
          <div className="flex items-center gap-3">
            <PersonIdentityAvatarTrigger
              personId={person.id}
              tenantSlug={tenantSlug}
              fullName={person.fullName}
              socialName={person.socialName}
              birthDate={person.birthDate ?? null}
              ageLabel={
                person.age !== null && person.age !== undefined
                  ? `${person.age} anos`
                  : null
              }
              avatarUrl={person.avatarUrl}
              hasHealthCondition={person.hasHealthCondition}
              hasMedication={person.hasMedication}
              isBirthdayToday={person.isBirthdayToday}
            />
            <div className="leading-tight">
              <div className="flex items-center gap-2">
                <p className="font-medium">{displayNames.primary}</p>
              </div>
              {displayNames.secondary ? (
                <p className="text-xs text-muted-foreground">
                  {displayNames.secondary}
                </p>
              ) : null}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "sex",
      header: "Sexo",
      meta: { dataType: "string", valueMap: SEX_LABELS },
      cell: ({ row }) => {
        const person = row.original;
        const label = resolveLabel(person.sex, SEX_LABELS);
        return (
          <Badge
            variant="outline"
            className={sexBadgeClass[person.sex ?? ""] ?? badgeTone.slate}
          >
            {label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "gender",
      header: "Genero",
      meta: { dataType: "string", valueMap: GENDER_LABELS },
      cell: ({ row }) => {
        const person = row.original;
        const label = resolveLabel(person.gender, GENDER_LABELS);
        return (
          <Badge
            variant="outline"
            className={genderBadgeClass[person.gender ?? ""] ?? badgeTone.slate}
          >
            {label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "personType",
      header: "Tipo",
      meta: { dataType: "string" },
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={
            row.original.personType === "Familiar"
              ? badgeTone.violet
              : badgeTone.blue
          }
        >
          {row.original.personType ?? "-"}
        </Badge>
      ),
    },
    {
      accessorKey: "raceColor",
      header: "Raça/Cor",
      meta: { dataType: "string", valueMap: RACE_COLOR_LABELS },
      cell: ({ row }) => {
        const person = row.original;
        const label = resolveLabel(person.raceColor, RACE_COLOR_LABELS);
        return (
          <Badge
            variant="outline"
            className={
              raceBadgeClass[person.raceColor ?? ""] ?? badgeTone.slate
            }
          >
            {label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "age",
      header: "Idade",
      meta: { dataType: "number" },
      cell: ({ row }) => {
        const age = row.original.age;
        if (age === null || age === undefined) return "-";
        return (
          <Badge variant="outline" className="inline-flex items-center gap-1">
            <span>{age} anos</span>
          </Badge>
        );
      },
    },
    {
      accessorKey: "isBirthdayMonth",
      header: "Aniversário",
      meta: { dataType: "boolean" },
      cell: ({ row }) => (
        <Badge variant={row.original.isBirthdayMonth ? "secondary" : "outline"}>
          {row.original.isBirthdayMonth ? "Sim" : "Não"}
        </Badge>
      ),
    },
    {
      accessorKey: "hasHealthCondition",
      header: "Condição",
      meta: { dataType: "boolean" },
      cell: ({ row }) => (
        <Badge
          variant={row.original.hasHealthCondition ? "secondary" : "outline"}
        >
          {row.original.hasHealthCondition ? "Sim" : "Não"}
        </Badge>
      ),
    },
    {
      accessorKey: "hasMedication",
      header: "Medicação",
      meta: { dataType: "boolean" },
      cell: ({ row }) => (
        <Badge variant={row.original.hasMedication ? "secondary" : "outline"}>
          {row.original.hasMedication ? "Sim" : "Não"}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      meta: { dataType: "string" },
      cell: ({ row }) => {
        const person = row.original;
        return (
          <Badge variant={getStatusVariant(person.status)}>
            {person.status ?? "Sem status"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "tags",
      header: "Tags",
      meta: { dataType: "string" },
      cell: ({ row }) => {
        const person = row.original;
        const disabled = updatingIds?.has(person.id) || !onInlineUpdate;
        return (
          <div className="flex items-start gap-2">
            <div className="flex flex-col gap-1">
              {person.tags && person.tags.length ? (
                person.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">Sem tags</span>
              )}
            </div>
            <TagsCell
              person={person}
              disabled={disabled}
              onSave={(tags) => onInlineUpdate?.(person.id, { tags })}
              suggestions={tagSuggestions}
            />
          </div>
        );
      },
    },
    {
      accessorKey: "birthDate",
      header: "Nascimento",
      meta: { dataType: "date" },
      cell: ({ row }) => formatDate(row.original.birthDate),
    },
    {
      accessorKey: "createdAt",
      header: "Cadastro",
      meta: { dataType: "date" },
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ];

  return columns;
}

