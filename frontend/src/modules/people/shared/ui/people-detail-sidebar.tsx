"use client";

import * as React from "react";
import type { Person } from "../domain/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SectionDialog } from "@/components/section-dialog";
import {
  formatDate,
  GENDER_LABELS,
  RACE_COLOR_LABELS,
  SEX_LABELS,
  resolvePersonDisplayNames,
  resolveLabel,
} from "../domain/utils";
import {
  Cake,
  ChevronDown,
  ExternalLink,
  HeartPulse,
  MapPin,
  MessageCircle,
  Pill,
} from "lucide-react";
import { SectionDivider } from "./people-detail-section-divider";
import { PersonIdentityAvatarTrigger } from "@/modules/people/shared/ui/person-identity-card";
import { usePathname } from "next/navigation";
import { getTenantSlugFromPath } from "@/lib/tenant-path";
import { useFamilyRelationsContext } from "@/modules/people/features/family-members/context/family-relations-context";
import { PersonContactsDialog } from "@/modules/people/features/contacts/ui/person-contacts-dialog";
import { PersonSensitiveDocumentsDialog } from "@/modules/people/features/sensitive-documents/ui/person-sensitive-documents-dialog";
import { useCurrentUser } from "@/features/auth/current-user-context";
import {
  getPersonEducations,
  listPersonContacts,
  type ApiPersonContact,
  type ApiPersonEducation,
} from "@/modules/people/api";
import { useAuth } from "@/features/auth/auth-context";
import {
  buildAddressLabel,
  buildAddressQuery,
  buildGoogleMapsSearchUrl,
} from "@/modules/people/shared/domain/address";

const normalizeRowValue = (value?: string | null) => {
  const trimmed = value?.trim() ?? "";
  if (!trimmed || trimmed === "-") return null;
  return trimmed;
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  const normalized = normalizeRowValue(value);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      {normalized ? (
        <span className="text-xs font-medium text-foreground">{normalized}</span>
      ) : (
        <span className="text-xs text-muted-foreground">-</span>
      )}
    </div>
  );
}

type PeopleDetailSidebarProps = {
  person: Person;
  ageLabel: string;
  isTodayBirthday: boolean;
  onCopy: (value: string) => void;
};

export function PeopleDetailSidebar({
  person,
  ageLabel,
  isTodayBirthday,
  onCopy,
}: PeopleDetailSidebarProps) {
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const { householdProfile, summaryLoading } = useFamilyRelationsContext();
  const { token } = useAuth();
  const { permissions } = useCurrentUser();
  const [contactsVersion, setContactsVersion] = React.useState(0);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [showScrollHint, setShowScrollHint] = React.useState(false);
  const [contacts, setContacts] = React.useState<ApiPersonContact[] | null>(
    null,
  );
  const [educations, setEducations] = React.useState<ApiPersonEducation[] | null>(
    null,
  );
  const displayNames = resolvePersonDisplayNames(
    person.fullName,
    person.socialName,
  );
  const addressLabel = buildAddressLabel({
    cep: householdProfile?.cep ?? null,
    street: householdProfile?.street ?? null,
    number: householdProfile?.number ?? null,
    neighborhood: householdProfile?.neighborhood ?? null,
    city: householdProfile?.city ?? null,
    state: householdProfile?.state ?? null,
  });
  const mapsQuery = buildAddressQuery({
    cep: householdProfile?.cep ?? null,
    street: householdProfile?.street ?? null,
    number: householdProfile?.number ?? null,
    neighborhood: householdProfile?.neighborhood ?? null,
    city: householdProfile?.city ?? null,
    state: householdProfile?.state ?? null,
  });
  const mapsUrl = buildGoogleMapsSearchUrl({
    cep: householdProfile?.cep ?? null,
    street: householdProfile?.street ?? null,
    number: householdProfile?.number ?? null,
    neighborhood: householdProfile?.neighborhood ?? null,
    city: householdProfile?.city ?? null,
    state: householdProfile?.state ?? null,
  });
  const embedUrl = mapsQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(
        mapsQuery,
      )}&output=embed`
    : null;

  const canReadSensitiveDocuments = permissions.includes("people.sensitive.read");
  const canUpdateSensitiveDocuments = permissions.includes(
    "people.sensitive.update",
  );
  const canAccessSensitiveDocuments =
    canReadSensitiveDocuments || canUpdateSensitiveDocuments;

  React.useEffect(() => {
    if (!token) return;
    listPersonContacts(token, person.id)
      .then((data) => setContacts(data))
      .catch(() => setContacts(null));
  }, [contactsVersion, person.id, token]);

  const updateScrollHint = React.useCallback(() => {
    const el = contentRef.current;
    if (!el) return;
    const scrollable = el.scrollHeight - el.clientHeight > 12;
    const atTop = el.scrollTop <= 8;
    setShowScrollHint(scrollable && atTop);
  }, []);

  React.useEffect(() => {
    if (!token) return;
    getPersonEducations(token, person.id)
      .then((data) => setEducations(data))
      .catch(() => setEducations(null));
  }, [person.id, token]);

  React.useEffect(() => {
    updateScrollHint();
  }, [updateScrollHint, contacts, educations, summaryLoading]);

  React.useEffect(() => {
    const handler = () => updateScrollHint();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [updateScrollHint]);

  const primaryEmail =
    contacts?.find(
      (contact) =>
        contact.role === "SELF" &&
        contact.type === "EMAIL" &&
        contact.isPrimary,
    )?.value ?? person.email;
  const primaryPhoneContact =
    contacts?.find(
      (contact) =>
        contact.role === "SELF" &&
        contact.type === "PHONE" &&
        contact.isPrimary,
    ) ?? null;
  const primaryPhone = primaryPhoneContact?.value ?? person.phone;
  const phoneDigits = primaryPhone ? primaryPhone.replace(/\D/g, "") : "";
  const whatsappUrl = phoneDigits ? `https://wa.me/${phoneDigits}` : null;
  const currentGrade =
    educations?.find((education) => education.isCurrent)?.grade ?? null;
  const sexLabel = normalizeRowValue(resolveLabel(person.sex, SEX_LABELS));
  const genderLabel = normalizeRowValue(resolveLabel(person.gender, GENDER_LABELS));
  const raceLabel = normalizeRowValue(resolveLabel(person.raceColor, RACE_COLOR_LABELS));

  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <CardHeader className="flex flex-col items-center gap-2 text-center">
        <div className="flex items-center gap-3">
          <PersonIdentityAvatarTrigger
            personId={person.id}
            tenantSlug={tenantSlug}
            fullName={person.fullName}
            socialName={person.socialName}
            birthDate={person.birthDate ?? null}
            ageLabel={ageLabel}
            avatarUrl={person.avatarUrl ?? "/avatar.jpg"}
            hasHealthCondition={person.hasHealthCondition}
            hasMedication={person.hasMedication}
            isBirthdayToday={isTodayBirthday}
            avatarClassName="h-40 w-40"
            tooltipLabel={null}
          />
          {(person.hasHealthCondition ||
            person.hasMedication ||
            isTodayBirthday) ? (
            <div className="flex flex-col items-center gap-2">
              {person.hasMedication ? (
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-blue-200 bg-blue-500 text-white shadow-sm">
                  <Pill className="h-4.5 w-4.5" />
                </span>
              ) : null}
              {person.hasHealthCondition ? (
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-rose-200 bg-rose-500 text-white shadow-sm">
                  <HeartPulse className="h-4.5 w-4.5" />
                </span>
              ) : null}
              {isTodayBirthday ? (
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-amber-200 bg-amber-500 text-white shadow-sm">
                  <Cake className="h-4.5 w-4.5" />
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div className="text-center">
            <p className="text-sm font-semibold">{displayNames.primary}</p>
            {displayNames.secondary ? (
              <p className="text-xs text-muted-foreground">
                {displayNames.secondary}
              </p>
            ) : null}
          </div>
          <Badge
            variant="outline"
            className="inline-flex items-center gap-1 border-emerald-200 bg-emerald-50 text-emerald-700"
          >
            {ageLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent
        ref={contentRef}
        onScroll={updateScrollHint}
        className="flex-1 min-h-0 space-y-2 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="space-y-2 text-xs">
          <InfoRow label="Tipo" value={person.personType ?? null} />
          <InfoRow label="Status" value={person.status ?? null} />
          <InfoRow label="Série/Ano" value={currentGrade} />
          <InfoRow label="Estado civil" value={person.maritalStatus ?? null} />
          <InfoRow label="Sexo" value={sexLabel} />
          <InfoRow label="Gênero" value={genderLabel} />
          <InfoRow label="Raça/Cor" value={raceLabel} />
          <InfoRow label="Nome social" value={person.socialName ?? null} />
          <InfoRow label="Nascimento" value={normalizeRowValue(formatDate(person.birthDate))} />
        </div>
        {showScrollHint ? (
          <div className="sticky bottom-0 -mx-6 mt-2">
            <div className="pointer-events-none relative h-10">
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-transparent" />
              <div className="absolute inset-x-0 bottom-1 flex justify-center">
                <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
                  Role para ver mais
                  <ChevronDown className="h-3 w-3" />
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <SectionDivider />
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-xs">Contatos</CardTitle>
            <PersonContactsDialog
              personId={person.id}
              seedEmail={primaryEmail ?? null}
              seedPhone={primaryPhone ?? null}
              onChanged={() => setContactsVersion((prev) => prev + 1)}
            />
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">Email</span>
              {primaryEmail ? (
                <a
                  href={`mailto:${primaryEmail}`}
                  className="text-xs font-medium text-foreground hover:text-foreground/80"
                >
                  {primaryEmail}
                </a>
              ) : (
                <span className="text-xs text-muted-foreground">-</span>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">
                Telefone
              </span>
              <div className="flex items-center gap-2">
                {primaryPhone ? (
                  <button
                    type="button"
                    className="text-xs font-medium text-foreground hover:text-foreground/80"
                    onClick={() => onCopy(primaryPhone ?? "")}
                    title="Copiar telefone"
                  >
                    {primaryPhone}
                  </button>
                ) : (
                  <span className="text-xs text-muted-foreground">-</span>
                )}
                {whatsappUrl ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    aria-label="Abrir WhatsApp"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-muted-foreground">
                Endereço
              </span>
              {summaryLoading ? (
                <span className="text-xs text-muted-foreground">
                  Carregando...
                </span>
              ) : addressLabel ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-xs font-medium text-foreground hover:text-foreground/80"
                    onClick={() => onCopy(addressLabel)}
                    title="Copiar endereço"
                  >
                    {addressLabel}
                  </button>
                  <SectionDialog
                    title="Mapa do endereço"
                    description={addressLabel}
                    trigger={
                      <button
                        type="button"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                        aria-label="Ver no mapa"
                        title="Ver no mapa"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                      </button>
                    }
                    headerSlot={
                      mapsUrl ? (
                        <Button size="sm" asChild>
                          <a href={mapsUrl} target="_blank" rel="noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Abrir no Google Maps
                          </a>
                        </Button>
                      ) : null
                    }
                    contentClassName="max-w-[min(96vw,52rem)]"
                  >
                    {embedUrl ? (
                      <div className="overflow-hidden rounded-xl border border-border/60 bg-muted/10">
                        <iframe
                          title="Mapa do endereço"
                          className="h-[420px] w-full"
                          src={embedUrl}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>
                    ) : (
                      <div className="rounded-xl border border-border/60 bg-muted/10 px-4 py-4 text-sm text-muted-foreground">
                        Cadastre o endereço (CEP, rua, número, cidade/UF) para
                        habilitar a visualização no mapa.
                      </div>
                    )}
                  </SectionDialog>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">-</span>
              )}
            </div>
          </div>
        </div>
        <SectionDivider />
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-xs">Documentos sensíveis</CardTitle>
            <PersonSensitiveDocumentsDialog personId={person.id} />
          </div>
          {canAccessSensitiveDocuments ? (
            <>
              <p className="text-[11px] text-muted-foreground">
                Clique em &quot;Gerenciar&quot; para visualizar/editar.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Acesso e alterações são auditados (LGPD).
              </p>
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Você não tem permissão para acessar documentos sensíveis.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

