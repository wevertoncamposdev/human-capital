"use client";

export const ACTIONS_LIST_TEXT = {
  breadcrumbTitle: "Ações",
  pageTitle: "Ações",
  pageSubtitle: "Planejamento e registro das atividades do educador.",
  noAccessTitle: "Ações",
  noAccessSubtitle: "Você não tem permissão para visualizar ações.",
  requestAccessHint: "Solicite acesso ao administrador do sistema.",
  loadProjectsErrorTitle: "Falha ao carregar projetos",
  loadActionsFallbackError: "Falha ao carregar ações.",
  newActionButton: "Nova ação",
  filters: {
    projectLabel: "Projeto",
    projectPlaceholder: "Selecione um projeto",
    scopeLabel: "Escopo",
    scopeProject: "Projeto",
    scopeGroup: "Grupo",
    scopeCycle: "Grupo de Pessoas",
    scopeFilterLabel: "Filtro",
    groupPlaceholder: "Todos os grupos",
    cyclePlaceholder: "Todos os grupos de pessoas",
    onlyMineTitle: "Somente minhas",
    onlyMineHint: "(desative para ver todas)",
    noneValueDash: "—",
  },
  table: {
    searchPlaceholder: "Pesquisar ações",
    summaryTotal: "Total",
    summaryFiltered: "Filtrados",
    colTitle: "Ações",
    colStatus: "Status",
    colPlanned: "Planejamento",
    colExecuted: "Execução",
    rowEdit: "Editar",
    unknownTypeDash: "—",
  },
  usage: {
    title: "Ações",
    sections: [
      {
        title: "Fluxo rápido",
        items: [
          "Selecione um projeto.",
          "Opcionalmente filtre por Grupo ou Segmento.",
          "Clique em “Nova ação” para planejar uma atividade.",
          "Clique em uma linha para abrir a ação e registrar execução, presença e conclusão.",
        ],
      },
      {
        title: "Permissões",
        items: [
          "Educadores veem por padrão apenas ações criadas por eles.",
          "Perfis com permissão de gestão podem desativar “Somente minhas” para ver todas.",
        ],
      },
    ],
  },
} as const;
