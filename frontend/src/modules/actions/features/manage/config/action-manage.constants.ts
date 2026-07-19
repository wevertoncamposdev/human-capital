"use client";

export const ACTION_MANAGE_TEXT = {
  back: "Voltar",
  print: "Imprimir",
  loading: "Carregando...",
  notFound: "Ação não encontrada.",
  noAccessTitle: "Ação",
  noAccessSubtitle: "Você não tem permissão para visualizar ações.",
  projectMissingTitle: "Ação",
  projectMissingSubtitle: "Projeto não informado",
  projectMissingHint: "Volte para a lista de ações e selecione um projeto.",
  requestAccessHint: "Solicite acesso ao administrador do sistema.",
  loadErrorTitle: "Falha ao carregar ação",
  loadErrorFallback: "Tente novamente.",
  saveOk: "Salvo",
  saveFailedTitle: "Falha ao salvar",
  tabs: {
    plan: "Planejamento",
    participants: "Participantes",
    team: "Equipe",
    executed: "Execução",
    conclusion: "Conclusão",
    quality: "Qualidade",
    photos: "Fotos",
    report: "Relatório",
    occurrences: "Ocorrências",
  },
  plan: {
    titleLabel: "Título",
    statusLabel: "Status",
    plannedLabel: "Planejado",
    plannedStartLabel: "Início planejado",
    plannedEndLabel: "Término planejado",
    planLabel: "Planejamento (RichText)",
    submit: "Salvar planejamento",
  },
  executed: {
    executedLabel: "Executado",
    executedStartLabel: "Início executado",
    executedEndLabel: "Término executado",
    executedRichLabel: "Relato do executado (RichText)",
    submit: "Salvar execução",
  },
  conclusion: {
    helper: "Breve relatório final da ação e resultado em relação ao planejado.",
    conclusionLabel: "Conclusão (RichText)",
    completionPercentLabel: "% atingida (0 a 100)",
    completionPercentHelper: "Estimativa do quanto foi atingido em relação ao planejado.",
    submit: "Salvar conclusão",
  },
  photos: {
    title: "Fotos",
    subtitle: "Adicione até 5 fotos desta ação.",
    empty: "Nenhuma foto adicionada.",
    upload: "Enviar foto",
    remove: "Remover",
    limit: "Limite de 5 fotos",
    uploadOk: "Foto adicionada",
    uploadFailed: "Falha ao enviar foto",
    galleryTitle: "Galeria",
    addPhotoTitle: "Adicionar foto",
    previous: "Anterior",
    next: "Próxima",
  },
  report: {
    title: "Relatório",
    subtitle: "Prévia do relatório completo. Use Imprimir para gerar um PDF.",
    loadFailed: "Falha ao carregar relatório.",
  },
  occurrences: {
    title: "Ocorrências",
    subtitle: "Gere ocorrências quando necessário (em breve).",
    hint: "No próximo passo vamos integrar a criação de ocorrências a partir dos participantes desta ação.",
  },
  usage: {
    title: "Gerenciar ação",
    sections: [
      {
        title: "Planejamento",
        items: [
          "Ajuste o título, status e o período planejado.",
          "Descreva objetivos, materiais, metodologia e etapas no RichText.",
          "Salve para manter o histórico e o relatório atualizado.",
        ],
      },
      {
        title: "Participantes e presença",
        items: [
          "Abra a aba Participantes para registrar presença/ausência.",
          "Use buscas e filtros para encontrar pessoas rapidamente.",
          "Os registros alimentam o gráfico e o resumo no relatório.",
        ],
      },
      {
        title: "Equipe, apoio e voluntariado",
        items: [
          "Use a aba Equipe para registrar facilitadores, apoio, voluntários e outros papéis.",
          "Cada pessoa pode ser vinculada com um papel próprio na ação.",
          "Esses vínculos aparecem separados do controle de presença do público.",
        ],
      },
      {
        title: "Execução",
        items: [
          "Registre o período executado e relate o que ocorreu no RichText.",
          "Use esse conteúdo para documentar adaptações e resultados reais.",
        ],
      },
      {
        title: "Conclusão e % atingida",
        items: [
          "Finalize com uma conclusão (breve relatório final) no RichText.",
          "Informe a % atingida (0 a 100) em relação ao planejado.",
          "Isso aparece em destaque no relatório e na impressão.",
        ],
      },
      {
        title: "Qualidade e destaques",
        items: [
          "Depois de registrar presença, avalie a qualidade (1 a 5).",
          "Marque participantes como destaque e adicione observações.",
          "Os destaques aparecem no relatório.",
        ],
      },
      {
        title: "Fotos e relatório",
        items: [
          "Envie até 5 fotos e revise a galeria.",
          "Na aba Relatório, confira a prévia completa (gráfico, destaques e fotos).",
          "Use Imprimir para gerar o PDF com todas as seções.",
        ],
      },
    ],
  },
} as const;
