"use client";

export const ACTION_RELATION_TEXT = {
  participants: {
    tabLabel: "Participantes",
    relationLabel: "Presenças",
    searchPlaceholder: "Pesquisar participantes",
    groupFilterLabel: "Grupo",
    allGroups: "Todos os grupos",
    statusFilterLabel: "Status",
    allStatuses: "Todos",
    notRecorded: "Não registrado",
    selectionOn: "Selecionar",
    selectionOff: "Cancelar seleção",
    save: "Salvar",
    savePendingTitle: "Status pendente",
    savePendingDescription:
      "Há participantes com presença sem status definido. Selecione Presente, Ausente ou Justificado antes de salvar.",
    saveOkTitle: "Presenças salvas",
    saveOkDescription: (created: number, updated: number) =>
      `${created} criadas • ${updated} atualizadas`,
    notesTitle: "Observação",
    notesDescription: "Registre justificativa ou ocorrência do participante.",
    notesLabel: "Observação",
    notesPlaceholder: "Ex.: chegou atrasado, saiu mais cedo, justificativa...",
    apply: "Aplicar",
    cancel: "Cancelar",
    stats: {
      total: "Total",
      filtered: "Filtrados",
      groups: "Grupos",
      changed: "Alterados",
    },
    columns: {
      person: "Pessoa",
      age: "Idade",
      sex: "Sexo",
      gender: "Gênero",
      raceColor: "Raça e cor",
      peopleGroups: "Grupos de pessoas",
      attendance: "Presença",
      notes: "Obs.",
    },
    bulk: {
      present: "Presente",
      absent: "Ausente",
      excused: "Justificado",
    },
  },
  quality: {
    tabLabel: "Qualidade",
    relationLabel: "Qualidade",
    searchPlaceholder: "Pesquisar participantes",
    groupFilterLabel: "Grupo",
    save: "Salvar",
    saveOkTitle: "Qualidade salva",
    saveNothingTitle: "Nada para salvar",
    saveNothingDescription: "Registre a presença antes de avaliar a qualidade.",
    notesTitle: "Observações",
    notesLabel: "Texto",
    addNote: "Adicionar",
    editNote: "Editar",
    stats: {
      tracked: "Com presença",
      filtered: "Filtrados",
      highlights: "Destaques",
      changed: "Alterados",
    },
    columns: {
      person: "Pessoa",
      score: "Nota",
      highlight: "Destaque",
      notes: "Observações",
    },
  },
} as const;

export const ACTION_RELATION_VALUES = {
  allGroups: "__all__",
  noScore: "__none__",
} as const;
