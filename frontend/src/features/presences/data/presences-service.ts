"use client";

import type { Presence, PresenceFormData } from "@/features/presences/domain/types";

const store = new Map<string, Presence[]>();

const seed: Record<string, Presence[]> = {
  "p-001": [
    { id: "pr-ana-01", date: "2025-11-02", status: "Presenca" },
    { id: "pr-ana-02", date: "2025-11-05", status: "Falta" },
    { id: "pr-ana-03", date: "2025-11-12", status: "Presenca" },
    { id: "pr-ana-04", date: "2025-11-19", status: "Presenca" },
    { id: "pr-ana-05", date: "2025-11-26", status: "Presenca" },
    { id: "pr-ana-06", date: "2025-12-03", status: "Falta" },
  ],
  "p-002": [
    { id: "pr-bruno-01", date: "2025-10-01", status: "Presenca" },
    { id: "pr-bruno-02", date: "2025-10-08", status: "Presenca" },
    { id: "pr-bruno-03", date: "2025-10-15", status: "Presenca" },
    { id: "pr-bruno-04", date: "2025-10-22", status: "Falta" },
    { id: "pr-bruno-05", date: "2025-10-29", status: "Presenca" },
  ],
  "p-003": [
    { id: "pr-carla-01", date: "2025-12-01", status: "Presenca" },
    { id: "pr-carla-02", date: "2025-12-08", status: "Presenca" },
    { id: "pr-carla-03", date: "2025-12-15", status: "Falta" },
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
    : `pr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export async function getPresencesByPersonId(
  personId: string,
): Promise<Presence[]> {
  ensureSeed();
  return store.get(personId) ?? [];
}

export async function createPresence(
  personId: string,
  data: PresenceFormData,
): Promise<Presence> {
  ensureSeed();
  const next = { id: createId(), ...data };
  const current = store.get(personId) ?? [];
  store.set(personId, [...current, next]);
  return next;
}

export async function updatePresence(
  personId: string,
  presenceId: string,
  data: PresenceFormData,
): Promise<Presence | null> {
  ensureSeed();
  const current = store.get(personId) ?? [];
  let updated: Presence | null = null;
  const next = current.map((item) => {
    if (item.id !== presenceId) return item;
    updated = { ...item, ...data };
    return updated;
  });
  store.set(personId, next);
  return updated;
}

export async function deletePresence(
  personId: string,
  presenceId: string,
): Promise<void> {
  ensureSeed();
  const current = store.get(personId) ?? [];
  store.set(
    personId,
    current.filter((item) => item.id !== presenceId),
  );
}
