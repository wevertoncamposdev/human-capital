"use client";

import type {
  SchoolHistory,
  SchoolHistoryFormData,
} from "@/features/school-histories/domain/types";

const store = new Map<string, SchoolHistory[]>();

const seed: Record<string, SchoolHistory[]> = {
  "p-001": [
    {
      id: "sch-ana-2023",
      year: 2023,
      school: "E.E. Jardim Azul",
      grade: "3º ano",
      shift: "Noturno",
    },
    {
      id: "sch-ana-2024",
      year: 2024,
      school: "E.E. Jardim Azul",
      grade: "3º ano",
      shift: "Noturno",
      isCurrent: true,
    },
  ],
  "p-002": [
    {
      id: "sch-bruno-2005",
      year: 2005,
      school: "E.E. Machado",
      grade: "3º ano",
      shift: "Manha",
      isCurrent: false,
    },
  ],
  "p-003": [
    {
      id: "sch-carla-1996",
      year: 1996,
      school: "E.E. Belo Horizonte",
      grade: "3º ano",
      shift: "Manha",
    },
  ],
};

const ensureSeed = () => {
  if (store.size > 0) return;
  Object.entries(seed).forEach(([personId, items]) => {
    store.set(personId, items.map((item) => ({ ...item })));
  });
};

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `sch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export async function getSchoolHistoriesByPersonId(
  personId: string,
): Promise<SchoolHistory[]> {
  ensureSeed();
  return store.get(personId) ?? [];
}

export async function createSchoolHistory(
  personId: string,
  data: SchoolHistoryFormData,
): Promise<SchoolHistory> {
  ensureSeed();
  const next = { id: createId(), ...data };
  const current = store.get(personId) ?? [];
  store.set(personId, [...current, next]);
  return next;
}

export async function updateSchoolHistory(
  personId: string,
  entryId: string,
  data: SchoolHistoryFormData,
): Promise<SchoolHistory | null> {
  ensureSeed();
  const current = store.get(personId) ?? [];
  let updated: SchoolHistory | null = null;
  const next = current.map((item) => {
    if (item.id !== entryId) return item;
    updated = { ...item, ...data };
    return updated;
  });
  store.set(personId, next);
  return updated;
}

export async function deleteSchoolHistory(
  personId: string,
  entryId: string,
): Promise<void> {
  ensureSeed();
  const current = store.get(personId) ?? [];
  store.set(
    personId,
    current.filter((item) => item.id !== entryId),
  );
}
