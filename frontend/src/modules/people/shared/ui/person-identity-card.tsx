"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Cake,
  HeartPulse,
  Pill,
  XIcon,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  FamilyRelationsProvider,
  useFamilyRelationsContext,
} from "@/modules/people/features/family-members/context/family-relations-context";
import { FamilyPreview } from "@/modules/people/features/family-members/ui/family-preview";
import { useAuth } from "@/features/auth/auth-context";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { resolveMediaUrl } from "@/lib/api";
import {
  getAgeFromBirthDate,
  getInitials,
  isBirthdayToday,
  resolvePersonDisplayNames,
} from "@/modules/people/shared/domain/utils";
import { withTenantPath } from "@/lib/tenant-path";
import {
  getPersonIdentity,
  type ApiPersonIdentityResponse,
} from "@/modules/people/api";

export type PersonIdentityCardProps = {
  personId?: string;
  tenantSlug?: string | null;
  fullName: string;
  socialName?: string | null;
  birthDate?: string | null;
  ageLabel?: string | null;
  avatarUrl?: string | null;
  hasHealthCondition?: boolean | null;
  hasMedication?: boolean | null;
  isBirthdayToday?: boolean | null;
  showDetailsLink?: boolean;
};

export function PersonIdentityCard({
  personId,
  tenantSlug,
  fullName,
  socialName,
  birthDate,
  ageLabel,
  avatarUrl,
  hasHealthCondition,
  hasMedication,
  isBirthdayToday: isBirthdayTodayProp,
  showDetailsLink = true,
}: PersonIdentityCardProps) {
  const { primary, secondary } = resolvePersonDisplayNames(
    fullName,
    socialName,
  );
  const avatarSrc = resolveMediaUrl(avatarUrl || "/avatar.jpg");
  const resolvedAgeLabel = React.useMemo(() => {
    if (ageLabel) return ageLabel;
    const ageValue = getAgeFromBirthDate(birthDate);
    return ageValue !== null ? `${ageValue} anos` : "Idade nao informada";
  }, [ageLabel, birthDate]);
  const isBirthday = React.useMemo(() => {
    if (typeof isBirthdayTodayProp === "boolean") return isBirthdayTodayProp;
    return isBirthdayToday(birthDate);
  }, [isBirthdayTodayProp, birthDate]);

  return (
    <div className="flex w-full flex-col gap-4 rounded-2xl border border-border/60 bg-muted/20 px-4 py-4 sm:flex-row sm:items-center">
      <div className="relative shrink-0 self-center sm:self-start">
        <Avatar className="h-28 w-28 sm:h-32 sm:w-32">
          <AvatarImage src={avatarSrc} />
          <AvatarFallback>{getInitials(fullName)}</AvatarFallback>
        </Avatar>
      </div>
      <div className="flex-1">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-base font-semibold text-foreground">
              {primary}
            </div>
            {secondary ? (
              <div className="text-sm text-muted-foreground">{secondary}</div>
            ) : null}
            <div className="mt-1 text-sm text-muted-foreground">
              {resolvedAgeLabel}
            </div>
          </div>
          {personId && showDetailsLink ? (
            <Link
              href={withTenantPath(`/people/${personId}`, tenantSlug)}
              className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-xs text-muted-foreground transition hover:text-foreground"
            >
              Ver detalhes
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-2">
          {hasHealthCondition ? (
            <Badge variant="outline" className="gap-1">
              <HeartPulse className="h-3.5 w-3.5 text-rose-500" />
              Saude
            </Badge>
          ) : null}
          {hasMedication ? (
            <Badge variant="outline" className="gap-1">
              <Pill className="h-3.5 w-3.5 text-blue-500" />
              Medicacao
            </Badge>
          ) : null}
          {isBirthday ? (
            <Badge variant="outline" className="gap-1">
              <Cake className="h-3.5 w-3.5 text-amber-500" />
              Aniversario
            </Badge>
          ) : null}
          {!hasHealthCondition && !hasMedication && !isBirthday ? (
            <span className="text-xs text-muted-foreground">
              Sem sinalizadores no momento
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type PersonIdentityDialogProps = PersonIdentityCardProps & {
  trigger: React.ReactNode;
  title?: string;
  subtitle?: string;
};

function mapIdentityMembersToPreview(
  members: ApiPersonIdentityResponse["family"]["livingTogether"],
) {
  return members.map((member) => ({
    id: member.id,
    name: resolvePersonDisplayNames(member.fullName, member.socialName).primary,
    fullName: member.fullName,
    socialName: member.socialName ?? null,
    birthDate: member.birthDate ?? null,
    role: member.role,
    avatarUrl: member.avatarUrl ?? null,
    hasHealthCondition: member.hasHealthCondition,
    hasMedication: member.hasMedication,
  }));
}

function PersonIdentityRelationsFooter() {
  const { data, detailedLoading } = useFamilyRelationsContext();

  if (detailedLoading) {
    return (
      <p className="text-xs text-muted-foreground">
        Carregando relacionamentos...
      </p>
    );
  }

  const householdMembers = data?.householdMembers ?? [];
  const relations = data?.relations ?? [];
  const relationByPerson = new Map(
    relations.map((relation) => [relation.relatedPersonId, relation.type]),
  );

  const livingMembers = householdMembers.map((member) => ({
    id: member.person.id,
    name: resolvePersonDisplayNames(
      member.person.fullName,
      member.person.socialName,
    ).primary,
    fullName: member.person.fullName,
    socialName: member.person.socialName ?? null,
    birthDate: member.person.birthDate ?? null,
    role: relationByPerson.get(member.personId) ?? member.role ?? "Mora junto",
    avatarUrl: member.person.avatarUrl ?? null,
    hasHealthCondition: member.person.hasHealthCondition ?? null,
    hasMedication: member.person.hasMedication ?? null,
  }));

  const livingIds = new Set(livingMembers.map((member) => member.id));
  const nonLivingRelations = relations.filter(
    (relation) =>
      !relation.livesTogether && !livingIds.has(relation.relatedPersonId),
  );
  const nonLivingMembers = nonLivingRelations.map((relation) => ({
    id: relation.relatedPerson.id,
    name: resolvePersonDisplayNames(
      relation.relatedPerson.fullName,
      relation.relatedPerson.socialName,
    ).primary,
    fullName: relation.relatedPerson.fullName,
    socialName: relation.relatedPerson.socialName ?? null,
    birthDate: relation.relatedPerson.birthDate ?? null,
    role: relation.type,
    avatarUrl: relation.relatedPerson.avatarUrl ?? null,
    hasHealthCondition: relation.relatedPerson.hasHealthCondition ?? null,
    hasMedication: relation.relatedPerson.hasMedication ?? null,
  }));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Moram juntos
        </p>
        <FamilyPreview members={livingMembers} />
      </div>
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Nao moram juntos
        </p>
        <FamilyPreview members={nonLivingMembers} />
      </div>
    </div>
  );
}

export function PersonIdentityDialog({
  trigger,
  title = "Identificacao",
  subtitle = "Perfil da pessoa",
  ...cardProps
}: PersonIdentityDialogProps) {
  const { token } = useAuth();
  const { permissions } = useCurrentUser();
  const canReadPeople = permissions.includes("people.read");
  const canReadIdentity =
    canReadPeople || permissions.includes("people.identity.read");

  const [open, setOpen] = React.useState(false);
  const [identity, setIdentity] = React.useState<ApiPersonIdentityResponse | null>(
    null,
  );
  const [identityLoading, setIdentityLoading] = React.useState(false);
  const [identityError, setIdentityError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    if (!token) return;
    if (!cardProps.personId) return;
    if (canReadPeople) return;
    if (!canReadIdentity) return;

    setIdentityLoading(true);
    setIdentityError(null);
    getPersonIdentity(token, cardProps.personId)
      .then((data) => setIdentity(data))
      .catch((err) => {
        const message =
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message)
            : "Falha ao carregar sinalizações.";
        setIdentityError(message);
      })
      .finally(() => setIdentityLoading(false));
  }, [open, token, cardProps.personId, canReadPeople, canReadIdentity]);

  const resolvedCardProps: PersonIdentityCardProps = identity?.person
    ? {
        ...cardProps,
        fullName: identity.person.fullName,
        socialName: identity.person.socialName ?? null,
        birthDate: identity.person.birthDate ?? null,
        avatarUrl: identity.person.avatarUrl ?? null,
        hasHealthCondition: identity.person.hasHealthCondition,
        hasMedication: identity.person.hasMedication,
      }
    : cardProps;

  const securedCardProps: PersonIdentityCardProps = canReadIdentity
    ? resolvedCardProps
    : {
        ...resolvedCardProps,
        birthDate: null,
        ageLabel: null,
        hasHealthCondition: false,
        hasMedication: false,
      };

  const relationsFooter = cardProps.personId ? (
    canReadPeople ? (
      <FamilyRelationsProvider
        personId={cardProps.personId}
        initialMode="detailed"
      >
        <PersonIdentityRelationsFooter />
      </FamilyRelationsProvider>
    ) : canReadIdentity ? (
      identityLoading ? (
        <p className="text-xs text-muted-foreground">
          Carregando relacionamentos...
        </p>
      ) : identityError ? (
        <p className="text-xs text-destructive">{identityError}</p>
      ) : identity ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Moram juntos
            </p>
            <FamilyPreview
              members={mapIdentityMembersToPreview(identity.family.livingTogether)}
            />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Nao moram juntos
            </p>
            <FamilyPreview
              members={mapIdentityMembersToPreview(
                identity.family.notLivingTogether,
              )}
            />
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Sem familiares registrados.
        </p>
      )
    ) : null
  ) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        className="max-w-2xl border-none bg-transparent p-0 shadow-none sm:max-w-2xl"
        showCloseButton={false}
      >
        <div className="rounded-3xl border border-border/60 bg-background p-5 shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {title}
              </p>
              <DialogTitle className="text-lg font-semibold text-foreground">
                {subtitle}
              </DialogTitle>
            </div>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                aria-label="Fechar"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
          <div className="mt-4">
            <PersonIdentityCard
              {...securedCardProps}
              showDetailsLink={canReadPeople}
            />
          </div>
          {relationsFooter ? (
            <div className="mt-4 rounded-2xl border border-border/60 bg-muted/20 px-3 py-3">
              {relationsFooter}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type PersonIdentityAvatarTriggerProps = PersonIdentityCardProps & {
  avatarClassName?: string;
  buttonClassName?: string;
  tooltipLabel?: string | null;
  tooltipClassName?: string;
};

export function PersonIdentityAvatarTrigger({
  avatarClassName,
  buttonClassName,
  tooltipLabel = "Ver perfil",
  tooltipClassName,
  ...cardProps
}: PersonIdentityAvatarTriggerProps) {
  const { permissions } = useCurrentUser();
  const canOpenDialog =
    !cardProps.personId ||
    permissions.includes("people.read") ||
    permissions.includes("people.identity.read");
  const { fullName, socialName, avatarUrl } = cardProps;
  const displayNames = resolvePersonDisplayNames(fullName, socialName);
  const avatarSrc = resolveMediaUrl(avatarUrl || "/avatar.jpg");

  const triggerNode = (
    <button
      type="button"
      disabled={!canOpenDialog}
      onClick={(event) => {
        event.stopPropagation();
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
      className={[
        "group relative rounded-full outline-none ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        canOpenDialog ? "hover:opacity-90" : "cursor-default opacity-90",
        buttonClassName,
      ]
        .filter(Boolean)
        .join(" ")}
      data-row-click-ignore="true"
      aria-label={
        canOpenDialog
          ? "Ver identificacao da pessoa"
          : "Sem permissao para ver identificacao"
      }
    >
      <Avatar className={["h-9 w-9", avatarClassName].filter(Boolean).join(" ")}>
        <AvatarImage src={avatarSrc} />
        <AvatarFallback>{getInitials(displayNames.primary)}</AvatarFallback>
      </Avatar>
      {tooltipLabel && canOpenDialog ? (
        <span
          className={[
            "pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-border/60 bg-background px-2 py-0.5 text-[10px] text-muted-foreground opacity-0 shadow-sm transition group-hover:opacity-100",
            tooltipClassName,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {tooltipLabel}
        </span>
      ) : null}
    </button>
  );

  if (!canOpenDialog) return triggerNode;

  return <PersonIdentityDialog {...cardProps} trigger={triggerNode} />;
}


