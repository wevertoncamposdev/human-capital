export const BENEFIT_FREQUENCY_OPTIONS = [
  { value: "MONTHLY", label: "Mensal" },
  { value: "WEEKLY", label: "Semanal" },
  { value: "BIWEEKLY", label: "Quinzenal" },
  { value: "ANNUAL", label: "Anual" },
  { value: "ONCE", label: "Avulso" },
] as const;

export const BENEFIT_STATUS_OPTIONS = [
  { value: "Ativo", label: "Ativo" },
  { value: "Suspenso", label: "Suspenso" },
  { value: "Encerrado", label: "Encerrado" },
  { value: "Em análise", label: "Em análise" },
  { value: "Não informado", label: "Não informado" },
] as const;

export const BENEFIT_TYPE_OPTIONS = [
  { value: "Bolsa Familia", label: "Bolsa Família" },
  { value: "BPC", label: "BPC" },
  { value: "Auxilio", label: "Auxílio" },
  { value: "Beneficio eventual", label: "Benefício eventual" },
  { value: "Tarifa social", label: "Tarifa social" },
  { value: "Outro", label: "Outro" },
] as const;

export const BENEFIT_TYPE_SUGGESTIONS = BENEFIT_TYPE_OPTIONS.map(
  (option) => option.label,
);

export const BENEFITS_TEXT = {
  cardTitle: "Benefícios",
  cardSubtitle: "Programas sociais e situação do benefício",
  emptyState: "Nenhum benefício cadastrado.",
  dialog: {
    createTitle: "Adicionar benefício",
    editTitle: "Editar benefício",
    description: "Registre o tipo, situação e, se aplicável, valor e período.",
  },
  form: {
    typeLabel: "Tipo",
    typePlaceholder: "Ex: Bolsa Família",
    statusLabel: "Situação",
    amountLabel: "Valor (para cálculo da renda familiar)",
    frequencyLabel: "Frequência",
    startDateLabel: "Início",
    endDateLabel: "Fim",
    notesLabel: "Observações",
    notesPlaceholder: "Detalhes do benefício",
    submitCreate: "Salvar",
    submitEdit: "Atualizar",
  },
  actions: {
    new: "Novo benefício",
  },
} as const;
