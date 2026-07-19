"use client";

import type { IncomeProfile, IncomeProfileFormData } from "@/features/incomes/domain/types";

const store = new Map<string, IncomeProfile[]>();

const seed: Record<string, IncomeProfile[]> = {
  "p-001": [
    {
      id: "inc-ana-01",
      income: 5200,
      incomeRange: { min: 4500, max: 6000 },
      otherIncome: 900,
      benefits: ["Bolsa Familia", "Vale Transporte"],
      employmentStatus: "CLT",
      employmentPeriod: { start: "2021-06-01", end: "2026-06-01" },
    },
  ],
  "p-002": [
    {
      id: "inc-bruno-01",
      income: 7400,
      incomeRange: { min: 6000, max: 9000 },
      otherIncome: 1500,
      benefits: ["Auxilio Gas"],
      employmentStatus: "Autonomo",
      employmentPeriod: { start: "2018-02-01", end: "2026-02-01" },
    },
  ],
  "p-003": [
    {
      id: "inc-carla-01",
      income: 3100,
      incomeRange: { min: 2500, max: 3800 },
      otherIncome: 0,
      benefits: ["Tarifa Social"],
      employmentStatus: "Desempregado",
      employmentPeriod: { start: "", end: "" },
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
    : `inc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export async function getIncomeProfilesByPersonId(
  personId: string,
): Promise<IncomeProfile[]> {
  ensureSeed();
  return store.get(personId) ?? [];
}

export async function createIncomeProfile(
  personId: string,
  data: IncomeProfileFormData,
): Promise<IncomeProfile> {
  ensureSeed();
  const next = { id: createId(), ...data };
  const current = store.get(personId) ?? [];
  store.set(personId, [...current, next]);
  return next;
}

export async function updateIncomeProfile(
  personId: string,
  incomeId: string,
  data: IncomeProfileFormData,
): Promise<IncomeProfile | null> {
  ensureSeed();
  const current = store.get(personId) ?? [];
  let updated: IncomeProfile | null = null;
  const next = current.map((item) => {
    if (item.id !== incomeId) return item;
    updated = { ...item, ...data };
    return updated;
  });
  store.set(personId, next);
  return updated;
}

export async function deleteIncomeProfile(
  personId: string,
  incomeId: string,
): Promise<void> {
  ensureSeed();
  const current = store.get(personId) ?? [];
  store.set(
    personId,
    current.filter((item) => item.id !== incomeId),
  );
}
