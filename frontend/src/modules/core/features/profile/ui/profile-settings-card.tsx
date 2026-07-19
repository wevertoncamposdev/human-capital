"use client";

import * as React from "react";
import { RecordForm } from "@/web-client/forms";
import type { FormField } from "@/web-client/forms/types";
import { useToast } from "@/components/ui/use-toast";
import { updateMyProfile, type CurrentUserProfile } from "@/features/auth/api";
import { uploadAvatar } from "@/features/uploads/api";
import { stripApiUrl } from "@/lib/api";

type ProfileValues = {
  name: string;
  phone: string;
  bio: string;
  avatarUrl: string | File | null;
};

const fields: FormField<ProfileValues>[] = [
  { name: "avatarUrl", label: "Foto", type: "image", accept: "image/*" },
  { name: "name", label: "Nome", type: "text", required: true },
  { name: "phone", label: "Telefone", type: "text" },
  {
    name: "bio",
    label: "Sobre",
    type: "textarea",
    helperText: "Um resumo curto para seu perfil (opcional).",
  },
];

export function ProfileSettingsCard({
  token,
  user,
  onSaved,
}: {
  token: string;
  user: CurrentUserProfile | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const initialValues = React.useMemo<ProfileValues>(
    () => ({
      name: user?.name ?? "",
      phone: user?.phone ?? "",
      bio: user?.bio ?? "",
      avatarUrl: user?.avatarUrl ?? null,
    }),
    [user?.name, user?.phone, user?.bio, user?.avatarUrl],
  );

  const handleSubmit = async (values: ProfileValues) => {
    setIsSubmitting(true);
    try {
      let avatarUrl: string | undefined = undefined;

      if (values.avatarUrl instanceof File) {
        const upload = await uploadAvatar(token, values.avatarUrl);
        avatarUrl = upload.path;
      } else if (typeof values.avatarUrl === "string") {
        avatarUrl = stripApiUrl(values.avatarUrl);
      } else if (values.avatarUrl === null) {
        avatarUrl = "";
      }

      await updateMyProfile(token, {
        name: values.name,
        phone: values.phone || undefined,
        bio: values.bio || undefined,
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
      });

      toast({ title: "Perfil atualizado" });
      onSaved();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro",
        description:
          err && typeof err === "object" && "message" in err
            ? String((err as { message?: string }).message)
            : "Falha ao atualizar perfil.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 space-y-1">
        <p className="text-sm font-semibold">Perfil</p>
        <p className="text-xs text-muted-foreground">
          Atualize seus dados pessoais e foto.
        </p>
      </div>

      {user?.roles?.length ? (
        <div className="mb-4 rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
          <p className="text-xs font-semibold text-foreground">
            Perfis de acesso
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {user.roles.map((role) => (
              <span
                key={role.id}
                className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                {role.name}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <RecordForm<ProfileValues>
        fields={fields}
        initialValues={initialValues}
        onSubmit={handleSubmit}
        disabled={isSubmitting}
        actions={{
          submit: { label: isSubmitting ? "Salvando..." : "Salvar", variant: "primary" },
        }}
      />
    </div>
  );
}
