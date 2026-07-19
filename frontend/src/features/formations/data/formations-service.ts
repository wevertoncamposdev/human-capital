"use client";

import type { Formation, FormationFormData } from "@/features/formations/domain/types";

const store = new Map<string, Formation[]>();

const seed: Record<string, Formation[]> = {
  "p-001": [
    {
      id: "edu-ana-01",
      institution: "Universidade Estadual",
      course: "Servico Social",
      level: "Graduacao",
      status: "Concluido",
      period: { start: "2012-02-01", end: "2016-12-15" },
    },
    {
      id: "edu-ana-02",
      institution: "Centro de Estudos Viver",
      course: "Gestao de Projetos Sociais",
      level: "Extensao",
      status: "Concluido",
      period: { start: "2020-03-01", end: "2020-09-30" },
    },
  ],
  "p-002": [
    {
      id: "edu-bruno-01",
      institution: "E.E. Machado",
      course: "Ensino Medio",
      level: "Ensino Medio",
      status: "Concluido",
      period: { start: "2003-02-01", end: "2005-12-15" },
    },
    {
      id: "edu-bruno-02",
      institution: "SENAI",
      course: "Mecanica Basica",
      level: "Curso tecnico",
      status: "Concluido",
      period: { start: "2008-03-01", end: "2009-02-15" },
    },
  ],
  "p-003": [
    {
      id: "edu-carla-01",
      institution: "Faculdade Central",
      course: "Administracao",
      level: "Graduacao",
      status: "Em andamento",
      period: { start: "2023-02-01", end: "" },
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
    : `edu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export async function getFormationsByPersonId(
  personId: string,
): Promise<Formation[]> {
  ensureSeed();
  return store.get(personId) ?? [];
}

export async function createFormation(
  personId: string,
  data: FormationFormData,
): Promise<Formation> {
  ensureSeed();
  const next = { id: createId(), ...data };
  const current = store.get(personId) ?? [];
  store.set(personId, [...current, next]);
  return next;
}

export async function updateFormation(
  personId: string,
  formationId: string,
  data: FormationFormData,
): Promise<Formation | null> {
  ensureSeed();
  const current = store.get(personId) ?? [];
  let updated: Formation | null = null;
  const next = current.map((item) => {
    if (item.id !== formationId) return item;
    updated = { ...item, ...data };
    return updated;
  });
  store.set(personId, next);
  return updated;
}

export async function deleteFormation(
  personId: string,
  formationId: string,
): Promise<void> {
  ensureSeed();
  const current = store.get(personId) ?? [];
  store.set(
    personId,
    current.filter((item) => item.id !== formationId),
  );
}
