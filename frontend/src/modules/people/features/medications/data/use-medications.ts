"use client";

import * as React from "react";
import { useAuth } from "@/features/auth/auth-context";
import {
  createPersonMedication,
  deletePersonMedication,
  getPersonMedications,
  updatePersonMedication,
} from "@/modules/people/api";
import type { Medication } from "@/modules/people/shared/domain/types";

type UseMedicationsResult = {
  medications: Medication[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (
    payload: Omit<Medication, "id" | "personId">,
  ) => Promise<Medication | null>;
  update: (
    medicationId: string,
    payload: Partial<Omit<Medication, "id" | "personId">>,
  ) => Promise<Medication | null>;
  remove: (medicationId: string) => Promise<void>;
};

export function useMedications(
  personId: string,
  options?: { enabled?: boolean },
): UseMedicationsResult {
  const { token } = useAuth();
  const enabled = options?.enabled ?? true;
  const [medications, setMedications] = React.useState<Medication[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPersonMedications(token, personId);
      setMedications(data);
    } catch (err) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: string }).message)
          : "Falha ao carregar medicacoes.";
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
    async (payload: Omit<Medication, "id" | "personId">) => {
      if (!token) return null;
      const created = await createPersonMedication(token, personId, payload);
      setMedications((previous) => [created, ...previous]);
      return created;
    },
    [token, personId],
  );

  const update = React.useCallback(
    async (
      medicationId: string,
      payload: Partial<Omit<Medication, "id" | "personId">>,
    ) => {
      if (!token) return null;
      const updated = await updatePersonMedication(token, personId, medicationId, payload);
      setMedications((previous) =>
        previous.map((item) => (item.id === medicationId ? updated : item)),
      );
      return updated;
    },
    [token, personId],
  );

  const remove = React.useCallback(
    async (medicationId: string) => {
      if (!token) return;
      await deletePersonMedication(token, personId, medicationId);
      await refresh();
    },
    [token, personId, refresh],
  );

  return { medications, isLoading, error, refresh, create, update, remove };
}


