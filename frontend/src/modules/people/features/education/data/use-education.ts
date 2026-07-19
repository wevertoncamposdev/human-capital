"use client";

import * as React from "react";
import { useAuth } from "@/features/auth/auth-context";
import {
  createPersonEducation,
  deletePersonEducation,
  getPersonEducations,
  updatePersonEducation,
} from "@/modules/people/api";
import type { EducationRecord } from "@/modules/people/shared/domain/types";

type UseEducationResult = {
  educations: EducationRecord[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (
    payload: Omit<EducationRecord, "id" | "personId">,
  ) => Promise<EducationRecord | null>;
  update: (
    educationId: string,
    payload: Partial<Omit<EducationRecord, "id" | "personId">>,
  ) => Promise<EducationRecord | null>;
  remove: (educationId: string) => Promise<void>;
};

export function useEducation(
  personId: string,
  options?: { enabled?: boolean },
): UseEducationResult {
  const { token } = useAuth();
  const enabled = options?.enabled ?? true;
  const [educations, setEducations] = React.useState<EducationRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPersonEducations(token, personId);
      setEducations(data);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Falha ao carregar escolaridade.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [token, personId]);

  React.useEffect(() => {
    if (!token || !enabled) return;
    refresh();
  }, [token, enabled, refresh]);

  const create = React.useCallback(
    async (payload: Omit<EducationRecord, "id" | "personId">) => {
      if (!token) return null;
      const created = await createPersonEducation(token, personId, payload);
      setEducations((previous) => [created, ...previous]);
      return created;
    },
    [token, personId],
  );

  const update = React.useCallback(
    async (
      educationId: string,
      payload: Partial<Omit<EducationRecord, "id" | "personId">>,
    ) => {
      if (!token) return null;
      const updated = await updatePersonEducation(token, personId, educationId, payload);
      setEducations((previous) =>
        previous.map((item) => (item.id === educationId ? updated : item)),
      );
      return updated;
    },
    [token, personId],
  );

  const remove = React.useCallback(
    async (educationId: string) => {
      if (!token) return;
      await deletePersonEducation(token, personId, educationId);
      await refresh();
    },
    [token, personId, refresh],
  );

  return { educations, isLoading, error, refresh, create, update, remove };
}
