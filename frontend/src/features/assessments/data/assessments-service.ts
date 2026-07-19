"use client";

import type { Assessment, AssessmentFormData } from "@/features/assessments/domain/types";

const store = new Map<string, Assessment[]>();

const seed: Record<string, Assessment[]> = {
  "p-001": [
    {
      id: "ass-ana-01",
      title: "Avaliacao socioeconomica",
      date: "2025-10-05",
      summary: "Analise inicial do perfil socioeconomico.",
      notesHtml:
        "<p>Registro de avaliacao inicial com pontos de atencao.</p>",
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
    : `ass-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export async function getAssessmentsByPersonId(
  personId: string,
): Promise<Assessment[]> {
  ensureSeed();
  return store.get(personId) ?? [];
}

export async function createAssessment(
  personId: string,
  data: AssessmentFormData,
): Promise<Assessment> {
  ensureSeed();
  const next = { id: createId(), ...data };
  const current = store.get(personId) ?? [];
  store.set(personId, [...current, next]);
  return next;
}

export async function updateAssessment(
  personId: string,
  assessmentId: string,
  data: AssessmentFormData,
): Promise<Assessment | null> {
  ensureSeed();
  const current = store.get(personId) ?? [];
  let updated: Assessment | null = null;
  const next = current.map((item) => {
    if (item.id !== assessmentId) return item;
    updated = { ...item, ...data };
    return updated;
  });
  store.set(personId, next);
  return updated;
}

export async function deleteAssessment(
  personId: string,
  assessmentId: string,
): Promise<void> {
  ensureSeed();
  const current = store.get(personId) ?? [];
  store.set(
    personId,
    current.filter((item) => item.id !== assessmentId),
  );
}
