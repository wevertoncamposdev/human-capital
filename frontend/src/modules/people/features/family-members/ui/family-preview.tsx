"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { PersonIdentityAvatarTrigger } from "@/modules/people/shared/ui/person-identity-card";
import { getTenantSlugFromPath, withTenantPath } from "@/lib/tenant-path";

export type FamilyPreviewMember = {
  id?: string;
  name: string;
  fullName: string;
  socialName?: string | null;
  birthDate?: string | null;
  role: string;
  avatarUrl?: string | null;
  hasHealthCondition?: boolean | null;
  hasMedication?: boolean | null;
};

export function FamilyPreview({ members }: { members: FamilyPreviewMember[] }) {
  const pathname = usePathname();
  const tenantSlug = getTenantSlugFromPath(pathname);
  const { permissions } = useCurrentUser();
  const canReadPeople = permissions.includes("people.read");
  if (!members.length) {
    return (
      <p className="text-xs text-muted-foreground">
        Sem familiares registrados.
      </p>
    );
  }

  return (
    <div className="text-right">
      <div className="flex items-center justify-end gap-4">
        {members.map((member) => (
          <div key={member.name} className="flex items-center gap-2">
            <div className="text-xs text-right">
              {member.id && canReadPeople ? (
                <Link
                  href={withTenantPath(`/people/${member.id}`, tenantSlug)}
                  className="font-medium text-foreground hover:text-foreground/80"
                >
                  {member.name}
                </Link>
              ) : (
                <p className="font-medium text-foreground">{member.name}</p>
              )}
              <p className="text-[11px] text-muted-foreground">{member.role}</p>
            </div>
            <PersonIdentityAvatarTrigger
              personId={member.id}
              tenantSlug={tenantSlug}
              fullName={member.fullName}
              socialName={member.socialName}
              birthDate={member.birthDate}
              avatarUrl={member.avatarUrl}
              hasHealthCondition={member.hasHealthCondition}
              hasMedication={member.hasMedication}
              avatarClassName="h-9 w-9 ring-2 ring-background"
              tooltipLabel={null}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

