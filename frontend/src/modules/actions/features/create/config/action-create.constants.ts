"use client";

export const ACTION_CREATE_TEXT = {
  breadcrumbTitle: "Nova ação",
  breadcrumbItems: [{ label: "Ações", href: "/actions" }, { label: "Nova ação" }],
  pageTitle: "Nova ação",
  pageSubtitle: "Nova ação",
  noAccessTitle: "Nova ação",
  noAccessSubtitle: "Você não tem permissão para criar ações.",
  requestAccessHint: "Solicite acesso ao administrador do sistema.",
  loadErrorTitle: "Falha ao carregar dados",
  loadErrorFallback: "Tente novamente.",
  validations: {
    projectRequired: "Selecione um projeto",
    typeRequired: "Selecione um tipo",
    titleRequired: "Informe um título",
    groupRequired: "Selecione um grupo de participantes",
    cycleRequired: "Selecione um grupo de pessoas",
  },
  toasts: {
    created: "Ação criada",
    createFailed: "Falha ao criar ação",
  },
  form: {
    projectLabel: "Projeto",
    projectPlaceholder: "Selecione um projeto",
    titleLabel: "Título",
    titlePlaceholder: "Ex.: Oficina de artes",
    typeLabel: "Tipo",
    typePlaceholder: "Selecione um tipo",
    targetLabel: "Direcionamento",
    statusLabel: "Status",
    groupLabel: "Grupo de Participantes",
    groupPlaceholder: "Selecione um grupo de participantes",
    cycleLabel: "Grupo de pessoas",
    cyclePlaceholder: "Selecione um grupo de pessoas",
    plannedStartLabel: "Início planejado",
    plannedEndLabel: "Término planejado",
    planLabel: "Planejamento",
    planHelper: "Descreva objetivos, materiais, metodologia e etapas.",
    submitLabel: "Criar ação",
    cancelLabel: "Voltar",
  },
  usage: {
    title: "Criar ação",
    sections: [
      {
        title: "Selecionar projeto",
        items: [
          "Selecione um projeto para associar a ação.",
          "Se houver apenas um projeto disponível, ele pode vir pré-selecionado.",
        ],
      },
      {
        title: "Tipo e escopo",
        items: [
          "Escolha o tipo: ele define se a ação é do projeto, de um grupo de participantes ou de um grupo de pessoas.",
          "Selecione o direcionamento correspondente para manter a ação ligada ao público correto.",
        ],
      },
      {
        title: "Planejamento",
        items: [
          "Preencha datas planejadas para facilitar relatórios e organização.",
          "Use o campo de planejamento para detalhar o que será feito.",
        ],
      },
    ],
  },
} as const;
