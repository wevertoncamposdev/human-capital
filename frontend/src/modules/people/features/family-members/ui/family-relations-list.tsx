"use client";

import * as React from "react";
import type {
  FamilyIncomeSummary,
  HouseholdMember,
  PersonRelation,
  PersonRelationInput,
  PersonSummary,
} from "@/modules/people/shared/domain/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/section-card";
import { SectionList, SectionListItem } from "@/components/section-list";
import { SectionListCollapse } from "@/components/section-list-collapse";
import { Badge } from "@/components/ui/badge";
import { PersonIdentityAvatarTrigger } from "@/modules/people/shared/ui/person-identity-card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, RefreshCw, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";
import {
  formatCurrency,
  getAgeFromBirthDate,
  isBirthdayToday,
  resolvePersonDisplayNames,
} from "@/modules/people/shared/domain/utils";

type FamilyRelationsListProps = {
  peopleOptions: PersonSummary[];
  relations: PersonRelation[];
  householdMembers: HouseholdMember[];
  incomeContributorIds: string[];
  isLoading: boolean;
  error?: string | null;
  currentPersonId: string;
  onRefresh: () => void;
  onCreate: (payload: PersonRelationInput) => Promise<unknown>;
  onUpdate: (
    relationId: string,
    payload: Partial<PersonRelationInput>,
  ) => Promise<unknown>;
  onDelete: (relationId: string) => Promise<void>;
  incomeSummary: FamilyIncomeSummary | null;
};

type RelationFormState = PersonRelationInput & {
  relationId?: string;
};

const RELATION_TYPE_OPTIONS = [
  "Pai",
  "Mãe",
  "Filho(a)",
  "Irmão(a)",
  "Irmãos por afinidade",
  "Cônjuge",
  "Padrasto",
  "Madrasta",
  "Enteado(a)",
  "Responsável",
  "Dependente",
  "Avô(a)",
  "Bisavô(ó)",
  "Tio(a)",
  "Tio-avô(ó)",
  "Primo(a)",
  "Sobrinho(a)",
  "Sobrinho-neto(a)",
  "Neto(a)",
  "Bisneto(a)",
  "Outro",
];

const HOUSEHOLD_ROLE_OPTIONS = [
  "Morador",
  "Responsável",
  "Dependente",
  "Provedor",
  "Outro",
];

const buildInitialForm = (
  peopleOptions: PersonSummary[],
  relation?: PersonRelation,
  householdMember?: HouseholdMember,
): RelationFormState => {
  const relatedPersonId =
    relation?.relatedPersonId ??
    householdMember?.personId ??
    peopleOptions[0]?.id ??
    "";
  return {
    relationId: relation?.id,
    relatedPersonId,
    type: relation?.type ?? "",
    livesTogether: relation?.livesTogether ?? Boolean(householdMember),
    isLegalGuardian:
      relation?.isLegalGuardian ?? householdMember?.isLegalGuardian ?? false,
    isHouseholdHead: householdMember?.isHouseholdHead ?? false,
    notes: relation?.notes ?? "",
    householdRole: householdMember?.role ?? "",
    isIncomeContributor: householdMember?.isIncomeContributor ?? false,
    isProvider: householdMember?.isProvider ?? false,
    isDependent: householdMember?.isDependent ?? false,
  };
};

const RelationBadge = ({ label }: { label: string }) => (
  <Badge variant="secondary" className="text-[11px]">
    {label}
  </Badge>
);

const FamilyRow = ({
  person,
  relationType,
  badges,
  tenantSlug,
  onEdit,
  onDelete,
}: {
  person: PersonSummary;
  relationType?: string;
  badges: string[];
  tenantSlug?: string | null;
  onEdit?: () => void;
  onDelete?: () => void;
}) => {
  const displayNames = resolvePersonDisplayNames(
    person.fullName,
    person.socialName,
  );
  const ageValue = getAgeFromBirthDate(person.birthDate ?? null);
  const ageLabel =
    ageValue !== null && ageValue !== undefined
      ? `${ageValue} anos`
      : "Idade nao informada";
  const isBirthday = isBirthdayToday(person.birthDate ?? null);

  return (
    <SectionListItem
      leading={(
        <PersonIdentityAvatarTrigger
          personId={person.id}
          tenantSlug={tenantSlug}
          fullName={person.fullName}
          socialName={person.socialName}
          birthDate={person.birthDate ?? null}
          ageLabel={ageLabel}
          avatarUrl={person.avatarUrl}
          hasHealthCondition={person.hasHealthCondition}
          hasMedication={person.hasMedication}
          isBirthdayToday={isBirthday}
        />
      )}
      title={(
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Link
              href={withTenantPath(`/people/${person.id}`, tenantSlug)}
              className="hover:text-foreground/80"
            >
              {displayNames.primary}
            </Link>
            {relationType ? <RelationBadge label={relationType} /> : null}
          </div>
          {displayNames.secondary ? (
            <span className="text-xs text-muted-foreground">
              {displayNames.secondary}
            </span>
          ) : null}
        </div>
      )}
      meta={badges.map((badge) => (
        <span
          key={badge}
          className="flex items-center gap-1 rounded-full border border-border/50 px-2 py-0.5 text-[10px]"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70" />
          {badge}
        </span>
      ))}
      actions={(
        <>
          {onEdit ? (
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-muted-foreground hover:text-foreground"
              onClick={onEdit}
            >
              <Pencil className="size-3" />
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-destructive hover:text-destructive/80"
              onClick={onDelete}
            >
              <Trash2 className="size-3" />
            </Button>
          ) : null}
        </>
      )}
    />
  );
};

const RelationDialog = ({
  title,
  description,
  peopleOptions,
  initial,
  disabledRelated,
  onSubmit,
  open,
  onOpenChange,
  triggerLabel,
}: {
  title: string;
  description: string;
  peopleOptions: PersonSummary[];
  initial: RelationFormState;
  disabledRelated?: boolean;
  onSubmit: (payload: RelationFormState) => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerLabel?: string;
}) => {
  const [form, setForm] = React.useState<RelationFormState>(initial);

  React.useEffect(() => {
    setForm(initial);
  }, [initial]);

  const canSubmit = Boolean(form.relatedPersonId) && Boolean(form.type?.trim());

  const handleSave = async () => {
    if (!canSubmit) return;
    await onSubmit(form);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {triggerLabel ? (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="gap-2">
            <Plus className="size-4" />
            {triggerLabel}
          </Button>
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Pessoa relacionada</Label>
            <Select
              value={form.relatedPersonId}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, relatedPersonId: value }))
              }
              disabled={disabledRelated}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma pessoa" />
              </SelectTrigger>
              <SelectContent>
                {peopleOptions.map((person) => {
                  const displayNames = resolvePersonDisplayNames(
                    person.fullName,
                    person.socialName,
                  );
                  return (
                    <SelectItem key={person.id} value={person.id}>
                      <span>{displayNames.primary}</span>
                      {displayNames.secondary ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {displayNames.secondary}
                        </span>
                      ) : null}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Tipo de vínculo</Label>
            <Select
              value={form.type}
              onValueChange={(value) =>
                setForm((prev) => ({ ...prev, type: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {RELATION_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 rounded-lg border border-border/60 p-3">
            <div className="flex items-center justify-between">
              <Label>Mora junto</Label>
              <Switch
                checked={Boolean(form.livesTogether)}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, livesTogether: checked }))
                }
              />
            </div>
            {form.livesTogether ? (
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label>Papel no domicílio</Label>
                  <Select
                    value={form.householdRole ?? ""}
                    onValueChange={(value) =>
                      setForm((prev) => ({ ...prev, householdRole: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um papel" />
                    </SelectTrigger>
                    <SelectContent>
                      {HOUSEHOLD_ROLE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Responsável legal</Label>
                    <Switch
                      checked={Boolean(form.isLegalGuardian)}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({
                          ...prev,
                          isLegalGuardian: checked,
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Responsável principal</Label>
                    <Switch
                      checked={Boolean(form.isHouseholdHead)}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({
                          ...prev,
                          isHouseholdHead: checked,
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Contribui com renda</Label>
                    <Switch
                      checked={Boolean(form.isIncomeContributor)}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({
                          ...prev,
                          isIncomeContributor: checked,
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Provedor</Label>
                    <Switch
                      checked={Boolean(form.isProvider)}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({ ...prev, isProvider: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Dependente</Label>
                    <Switch
                      checked={Boolean(form.isDependent)}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({ ...prev, isDependent: checked }))
                      }
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label>Observações</Label>
            <Textarea
              value={form.notes ?? ""}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, notes: event.target.value }))
              }
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!canSubmit}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export function FamilyRelationsList({
  peopleOptions,
  relations,
  householdMembers,
  incomeContributorIds,
  isLoading,
  error,
  currentPersonId,
  onRefresh,
  onCreate,
  onUpdate,
  onDelete,
  incomeSummary,
}: FamilyRelationsListProps) {
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const relationByPerson = React.useMemo(() => {
    const map = new Map<string, PersonRelation>();
    relations.forEach((relation) => {
      map.set(relation.relatedPersonId, relation);
    });
    return map;
  }, [relations]);
  const contributionMap = React.useMemo(() => {
    const map = new Map<string, number>();
    incomeSummary?.contributions?.forEach((item) => {
      map.set(item.personId, item.amount);
    });
    return map;
  }, [incomeSummary]);

  const livingMembers = householdMembers.map((member) => ({
    member,
    relation: relationByPerson.get(member.personId),
  }));

  const externalRelations = relations.filter(
    (relation) => !relation.livesTogether,
  );

  const [editing, setEditing] = React.useState<{
    relation?: PersonRelation;
    member?: HouseholdMember;
  } | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);

  const handleCreate = async (payload: RelationFormState) => {
    await onCreate(payload);
    onRefresh();
  };

  const handleEditSave = async (payload: RelationFormState) => {
    if (payload.relationId) {
      await onUpdate(payload.relationId, payload);
    } else {
      await onCreate(payload);
    }
    setEditing(null);
    setEditOpen(false);
    onRefresh();
  };

  const handleDelete = async (relationId: string) => {
    await onDelete(relationId);
    onRefresh();
  };

  const createInitial = React.useMemo(
    () => buildInitialForm(peopleOptions),
    [peopleOptions],
  );

  if (isLoading) {
    return (
      <SectionCard
        title="Núcleo familiar"
        subtitle="Membros, vínculos e contribuições"
      >
        <p className="text-sm text-muted-foreground">
          Carregando relações familiares...
        </p>
      </SectionCard>
    );
  }

  if (error) {
    return (
      <SectionCard
        title="Núcleo familiar"
        subtitle="Membros, vínculos e contribuições"
      >
        <p className="text-sm text-destructive">{error}</p>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Núcleo familiar"
      subtitle="Membros, vínculos e contribuições"
      collapsible
      defaultOpen={false}
      actions={
        <div className="flex items-center gap-2">
          <RelationDialog
            title="Adicionar vínculo"
            description="Registre um familiar e as informações sociais."
            peopleOptions={peopleOptions}
            initial={createInitial}
            open={createOpen}
            onOpenChange={setCreateOpen}
            triggerLabel="Novo vínculo"
            onSubmit={handleCreate}
          />
          <Button
            size="icon"
            variant="ghost"
            className="size-8"
            onClick={onRefresh}
            title="Atualizar"
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
      }
    >
      <div className="grid gap-3 lg:grid-cols-2">
        <SectionListCollapse title="Moram juntos" count={livingMembers.length} defaultOpen>
          <SectionList>
            {livingMembers.length ? (
              livingMembers.map(({ member, relation }) => {
                const isSelf = member.personId === currentPersonId;
                const contributesIncome =
                  member.isIncomeContributor ||
                  incomeContributorIds.includes(member.personId);
                const contributionAmount =
                  contributionMap.get(member.personId) ?? 0;
                const badges = [
                  member.isLegalGuardian ? "Responsável legal" : null,
                  member.isHouseholdHead ? "Responsável principal" : null,
                  member.isProvider ? "Provedor" : null,
                  contributionAmount > 0
                    ? `Contribui ${formatCurrency(contributionAmount)}`
                    : contributesIncome
                      ? "Contribui renda"
                      : null,
                  member.isDependent ? "Dependente" : null,
                ].filter(Boolean) as string[];
                return (
                  <FamilyRow
                    key={member.id}
                    person={member.person}
                    relationType={relation?.type ?? member.role ?? "Morador"}
                    tenantSlug={tenantSlug}
                    badges={badges}
                    onEdit={
                      !isSelf
                        ? () => {
                            setEditing({ relation, member });
                            setEditOpen(true);
                          }
                        : undefined
                    }
                    onDelete={
                      relation && !isSelf
                        ? () => handleDelete(relation.id)
                        : undefined
                    }
                  />
                );
              })
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Nenhum familiar registrado na residência.
              </p>
            )}
          </SectionList>
        </SectionListCollapse>
        <SectionListCollapse
          title="Não moram juntos"
          count={externalRelations.length}
          defaultOpen={externalRelations.length > 0}
        >
          <SectionList>
            {externalRelations.length ? (
              externalRelations.map((relation) => {
                const contributionAmount =
                  contributionMap.get(relation.relatedPersonId) ?? 0;
                const badges = [
                  relation.isLegalGuardian ? "Responsável legal" : null,
                  contributionAmount > 0
                    ? `Contribui ${formatCurrency(contributionAmount)}`
                    : incomeContributorIds.includes(relation.relatedPersonId)
                      ? "Contribui renda"
                      : null,
                ].filter(Boolean) as string[];
                return (
                  <FamilyRow
                    key={relation.id}
                    person={relation.relatedPerson}
                    relationType={relation.type}
                    tenantSlug={tenantSlug}
                    badges={badges}
                    onEdit={() => {
                      setEditing({ relation });
                      setEditOpen(true);
                    }}
                    onDelete={() => handleDelete(relation.id)}
                  />
                );
              })
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Nenhum familiar registrado fora da residência.
              </p>
            )}
          </SectionList>
        </SectionListCollapse>
      </div>
      {editing && (
        <RelationDialog
          title="Editar vínculo"
          description="Atualize as informações do familiar."
          peopleOptions={peopleOptions}
          initial={buildInitialForm(
            peopleOptions,
            editing.relation,
            editing.member,
          )}
          disabledRelated={Boolean(editing.member)}
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) setEditing(null);
          }}
          onSubmit={handleEditSave}
        />
      )}
    </SectionCard>
  );
}







