"use client";

import type {
  Attendance,
  AttendanceFormData,
} from "@/features/attendances/domain/types";

const store = new Map<string, Attendance[]>();

const seed: Record<string, Attendance[]> = {
  "p-001": [
    {
      id: "att-ana-01",
      title: "Entrevista inicial",
      summary: "Levantamento do contexto familiar e necessidades imediatas.",
      date: "2025-10-12",
      type: "Social",
      staffName: "Marina Oliveira",
      notesHtml:
        "<p>Realizada entrevista inicial com foco em renda e moradia. Familia relatou dificuldade em manter despesas mensais.</p>",
    },
    {
      id: "att-ana-02",
      title: "Acompanhamento social",
      summary: "Atualizacao do plano de acompanhamento e beneficios.",
      date: "2025-11-25",
      type: "Familiar",
      staffName: "Carlos Menezes",
      notesHtml:
        "<p>Atualizamos o cadastro e registramos novos beneficios solicitados. Proximo retorno em 30 dias.</p>",
    },
  ],
  "p-002": [
    {
      id: "att-bruno-01",
      title: "Visita domiciliar",
      summary: "Verificacao das condicoes de moradia e composicao familiar.",
      date: "2025-08-03",
      type: "Familiar",
      staffName: "Paula Andrade",
      notesHtml:
        "<p>Residencia em boas condicoes gerais. Familia relatou estabilidade recente de renda.</p>",
    },
  ],
  "p-003": [
    {
      id: "att-carla-01",
      title: "Atendimento emergencial",
      summary: "Orientacao sobre acesso a programas assistenciais.",
      date: "2025-12-15",
      type: "Social",
      staffName: "Rafaela Costa",
      notesHtml:
        "<p>Realizada orientacao sobre programas de apoio disponiveis no municipio.</p>",
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
    : `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export async function getAttendancesByPersonId(
  personId: string,
): Promise<Attendance[]> {
  ensureSeed();
  return store.get(personId) ?? [];
}

export async function createAttendance(
  personId: string,
  data: AttendanceFormData,
): Promise<Attendance> {
  ensureSeed();
  const next = { id: createId(), ...data };
  const current = store.get(personId) ?? [];
  store.set(personId, [...current, next]);
  return next;
}

export async function updateAttendance(
  personId: string,
  attendanceId: string,
  data: AttendanceFormData,
): Promise<Attendance | null> {
  ensureSeed();
  const current = store.get(personId) ?? [];
  let updated: Attendance | null = null;
  const next = current.map((item) => {
    if (item.id !== attendanceId) return item;
    updated = { ...item, ...data };
    return updated;
  });
  store.set(personId, next);
  return updated;
}

export async function deleteAttendance(
  personId: string,
  attendanceId: string,
): Promise<void> {
  ensureSeed();
  const current = store.get(personId) ?? [];
  store.set(
    personId,
    current.filter((item) => item.id !== attendanceId),
  );
}
