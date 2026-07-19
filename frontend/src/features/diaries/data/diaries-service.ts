"use client";

import type { DiaryEntry, DiaryEntryFormData } from "@/features/diaries/domain/types";

const store = new Map<string, DiaryEntry[]>();

const seed: Record<string, DiaryEntry[]> = {
  "p-001": [
    {
      id: "dia-ana-01",
      title: "Contato telefonico",
      summary: "Relatou dificuldade de comparecer ao atendimento.",
      date: "2025-11-02",
      notesHtml:
        "<p>Telefonei para confirmar presenca. Informou que estava sem transporte.</p>",
    },
    {
      id: "dia-ana-02",
      title: "Visita rapida",
      summary: "Atualizou endereco e contatos.",
      date: "2025-12-05",
      notesHtml:
        "<p>Confirmamos novo endereco e registro de contato secundario.</p>",
    },
  ],
  "p-002": [
    {
      id: "dia-bruno-01",
      title: "Registro de contato",
      summary: "Agendou retorno para entregar documentos.",
      date: "2025-08-10",
      notesHtml:
        "<p>Familia combinou envio de comprovantes ate o final do mes.</p>",
    },
  ],
  "p-003": [
    {
      id: "dia-carla-01",
      title: "Anotacao geral",
      summary: "Aguardando retorno da familia.",
      date: "2025-12-20",
      notesHtml:
        "<p>Sem novas informacoes desde o ultimo atendimento.</p>",
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
    : `dia-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export async function getDiariesByPersonId(
  personId: string,
): Promise<DiaryEntry[]> {
  ensureSeed();
  return store.get(personId) ?? [];
}

export async function createDiary(
  personId: string,
  data: DiaryEntryFormData,
): Promise<DiaryEntry> {
  ensureSeed();
  const next = { id: createId(), ...data };
  const current = store.get(personId) ?? [];
  store.set(personId, [...current, next]);
  return next;
}

export async function updateDiary(
  personId: string,
  entryId: string,
  data: DiaryEntryFormData,
): Promise<DiaryEntry | null> {
  ensureSeed();
  const current = store.get(personId) ?? [];
  let updated: DiaryEntry | null = null;
  const next = current.map((item) => {
    if (item.id !== entryId) return item;
    updated = { ...item, ...data };
    return updated;
  });
  store.set(personId, next);
  return updated;
}

export async function deleteDiary(
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
