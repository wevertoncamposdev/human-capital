export const NAV_GROUPS = {
  PAINEL: "Painel",
  GESTAO: "Gestão",
  OPERACOES: "Operações",
  INSTITUCIONAL: "Institucional",
  FINANCEIRO: "Financeiro",
  RECURSOS: "Recursos",
  EDUCACAO: "Educação",
  RELATORIOS: "Relatórios",
  ADMINISTRACAO: "Administração",
  PORTAIS: "Portais",
  ASSINATURA: "Assinatura",
} as const;

export const NAV_GROUP_ORDER: Record<string, number> = {
  // Estrutura alinhada ao `docs/sidebar.md`
  [NAV_GROUPS.PAINEL]: 10,
  [NAV_GROUPS.GESTAO]: 20,
  [NAV_GROUPS.OPERACOES]: 30,
  [NAV_GROUPS.INSTITUCIONAL]: 40,
  [NAV_GROUPS.FINANCEIRO]: 50,
  [NAV_GROUPS.RECURSOS]: 60,
  [NAV_GROUPS.EDUCACAO]: 70,
  [NAV_GROUPS.RELATORIOS]: 80,
  [NAV_GROUPS.ADMINISTRACAO]: 90,
  [NAV_GROUPS.PORTAIS]: 100,
  [NAV_GROUPS.ASSINATURA]: 110,

  // Compatibilidade temporária (se algum módulo ainda não foi migrado)
  Geral: 10,
  Cadastros: 20,
  Organização: 25,
  "Suporte Material": 60,
};
