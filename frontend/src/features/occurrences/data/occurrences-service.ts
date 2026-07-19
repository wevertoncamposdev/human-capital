"use client";

import type {
  Occurrence,
  OccurrenceFormData,
} from "@/features/occurrences/domain/types";

const store = new Map<string, Occurrence[]>();

const seed: Record<string, Occurrence[]> = {
  "p-001": [
    {
      id: "occ-ana-01",
      title: "Conflito familiar",
      type: "Convivencia",
      status: "Em andamento",
      date: "2025-11-18",
      summary: "Relato de conflito entre responsavel e adolescente.",
      initialReportHtml:
        "<p>Familia informou discussao frequente e necessidade de orientacao.</p>",
      actionItems: [
        "Reuniao com a familia",
        "Encaminhamento para apoio psicologico",
      ],
      progressNotesHtml:
        "<p>Realizada primeira reuniao. Familia aceitou acompanhamento.</p>",
      resolutionHtml: "",
    },
  ],
  "p-002": [
    {
      id: "occ-bruno-01",
      title: "Ausencia escolar",
      type: "Educacional",
      status: "Finalizada",
      date: "2025-07-12",
      summary: "Historico de faltas sem justificativa.",
      initialReportHtml:
        "<p>Escola reportou faltas recorrentes no ultimo bimestre.</p>",
      actionItems: ["Contato com responsavel", "Plano de acompanhamento"],
      progressNotesHtml:
        "<p>Responsavel apresentou justificativas e ajustou rotina.</p>",
      resolutionHtml:
        "<p>Frequencia regularizada e acompanhamento encerrado.</p>",
    },
  ],
  "p-003": [
    {
      id: "occ-carla-01",
      title: "Situacao de saude",
      type: "Saude",
      status: "Inicial",
      date: "2025-12-02",
      summary: "Relato de necessidade de consulta medica.",
      initialReportHtml:
        "<p>Familia solicitou apoio para agendamento medico.</p>",
      actionItems: ["Encaminhamento ao posto de saude"],
      progressNotesHtml: "",
      resolutionHtml: "",
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
    : `occ-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export async function getOccurrencesByPersonId(
  personId: string,
): Promise<Occurrence[]> {
  ensureSeed();
  return store.get(personId) ?? [];
}

export async function createOccurrence(
  personId: string,
  data: OccurrenceFormData,
): Promise<Occurrence> {
  ensureSeed();
  const next = { id: createId(), ...data };
  const current = store.get(personId) ?? [];
  store.set(personId, [...current, next]);
  return next;
}

export async function updateOccurrence(
  personId: string,
  occurrenceId: string,
  data: OccurrenceFormData,
): Promise<Occurrence | null> {
  ensureSeed();
  const current = store.get(personId) ?? [];
  let updated: Occurrence | null = null;
  const next = current.map((item) => {
    if (item.id !== occurrenceId) return item;
    updated = { ...item, ...data };
    return updated;
  });
  store.set(personId, next);
  return updated;
}

export async function deleteOccurrence(
  personId: string,
  occurrenceId: string,
): Promise<void> {
  ensureSeed();
  const current = store.get(personId) ?? [];
  store.set(
    personId,
    current.filter((item) => item.id !== occurrenceId),
  );
}
