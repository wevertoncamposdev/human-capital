"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/features/auth/auth-context";
import { useCurrentUser } from "@/features/auth/current-user-context";
import { useRequireAuth } from "@/hooks/use-require-auth";
import { PageBreadcrumb } from "@/components/layout/PageBreadcrumb";
import { AccessLogsPanel } from "./access-logs-panel";
import { ProfileSettingsCard } from "./profile-settings-card";
import { TotpSettingsCard } from "./totp-settings-card";
import { ProfileHeader, type ProfileTabKey } from "./profile-header";

export function ProfileClientPage() {
  const { token } = useAuth();
  const { user, refresh } = useCurrentUser();
  const { isAuthenticated, isLoading: authLoading } = useRequireAuth();
  const [tab, setTab] = useState<ProfileTabKey>("profile");

  const enabled = useMemo(
    () => Boolean(token && isAuthenticated && !authLoading),
    [token, isAuthenticated, authLoading],
  );

  if (!enabled || !token) {
    return (
      <div className="min-h-[calc(100vh-64px)] px-4 py-10 flex items-center justify-center text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-4">
      <PageBreadcrumb
        title="Perfil"
        items={[{ label: "Perfil", href: "/dashboard/profile" }]}
      />

      <ProfileHeader tab={tab} onTabChange={setTab} user={user} />

      <div className="space-y-4">
        {tab === "profile" ? (
          <ProfileSettingsCard
            token={token}
            user={user}
            onSaved={() => refresh()}
          />
        ) : null}
        {tab === "security" ? (
          <TotpSettingsCard
            token={token}
            enabled={Boolean(user?.mfaTotpEnabled)}
            onChanged={() => refresh()}
          />
        ) : null}
        {tab === "logs" ? <AccessLogsPanel token={token} /> : null}
      </div>
    </div>
  );
}
