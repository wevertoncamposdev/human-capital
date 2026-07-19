"use client";

import type { Activity, ActivityFormData } from "@/features/activities/domain/types";

const store = new Map<string, Activity[]>();

const seed: Record<string, Activity[]> = {
  "p-001": [
    {
      id: "act-ana-01",
      title: "Oficina de convivencia",
      date: "2025-11-20",
      status: "Concluida",
      notesHtml: "<p>Participou com boa interacao.</p>",
    },
  ],
  "p-002": [],
  "p-003": [],
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
    : `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export async function getActivitiesByPersonId(
  personId: string,
): Promise<Activity[]> {
  ensureSeed();
  return store.get(personId) ?? [];
}

export async function createActivity(
  personId: string,
  data: ActivityFormData,
): Promise<Activity> {
  ensureSeed();
  const next = { id: createId(), ...data };
  const current = store.get(personId) ?? [];
  store.set(personId, [...current, next]);
  return next;
}

export async function updateActivity(
  personId: string,
  activityId: string,
  data: ActivityFormData,
): Promise<Activity | null> {
  ensureSeed();
  const current = store.get(personId) ?? [];
  let updated: Activity | null = null;
  const next = current.map((item) => {
    if (item.id !== activityId) return item;
    updated = { ...item, ...data };
    return updated;
  });
  store.set(personId, next);
  return updated;
}

export async function deleteActivity(
  personId: string,
  activityId: string,
): Promise<void> {
  ensureSeed();
  const current = store.get(personId) ?? [];
  store.set(
    personId,
    current.filter((item) => item.id !== activityId),
  );
}
