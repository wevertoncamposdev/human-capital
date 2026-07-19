"use client";

export const ACTION_REPORT_TEXT = {
  titles: {
    planned: "Planejamento",
    executed: "Execução",
    presence: "Presença",
    chart: "Presentes vs faltantes",
    highlights: "Destaques",
    planHtml: "Planejamento",
    executedHtml: "Executado",
    conclusionHtml: "Conclusão",
    photos: "Fotos",
  },
  labels: {
    completionPercent: "% atingida",
    participantsTotal: "Participantes",
    present: "Presentes",
    missing: "Faltantes",
  },
  hints: {
    noPeoplePermission: "Sem permissão para exibir participantes.",
    noHighlights: "Nenhum destaque registrado.",
    notInformed: "Não informado.",
  },
  breakdown: {
    absent: "Ausentes",
    excused: "Justificados",
    notRecorded: "Não registrado",
  },
} as const;
