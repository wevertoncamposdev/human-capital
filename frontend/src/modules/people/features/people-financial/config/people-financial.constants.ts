export const FINANCIAL_ENTRY_TYPE_OPTIONS = [
  { value: "INCOME", label: "Renda" },
  { value: "EXPENSE", label: "Gasto" },
  { value: "TRANSFER", label: "Transferencia" },
  { value: "BENEFIT", label: "Beneficio" },
] as const;

export const FINANCIAL_FREQUENCY_OPTIONS = [
  { value: "MONTHLY", label: "Mensal" },
  { value: "WEEKLY", label: "Semanal" },
  { value: "BIWEEKLY", label: "Quinzenal" },
  { value: "ANNUAL", label: "Anual" },
  { value: "ONCE", label: "Avulso" },
] as const;

export const FINANCIAL_CATEGORY_OPTIONS = {
  INCOME: [
    { value: "Salario", label: "Salario" },
    { value: "Renda extra", label: "Renda extra" },
    { value: "Pensao", label: "Pensao" },
    { value: "Ajuda familiar", label: "Ajuda familiar" },
    { value: "Outro", label: "Outro" },
  ],
  EXPENSE: [
    { value: "Aluguel", label: "Aluguel" },
    { value: "Alimentacao", label: "Alimentacao" },
    { value: "Agua", label: "Agua" },
    { value: "Luz", label: "Luz" },
    { value: "Gas", label: "Gas" },
    { value: "Internet", label: "Internet" },
    { value: "Telefone", label: "Telefone" },
    { value: "Transporte", label: "Transporte" },
    { value: "Saude", label: "Saude" },
    { value: "Educacao", label: "Educacao" },
    { value: "Outro", label: "Outro" },
  ],
  TRANSFER: [
    { value: "TRANSFER", label: "Transferencia" },
    { value: "PENSION", label: "Pensao" },
  ],
  BENEFIT: [
    { value: "Bolsa familia", label: "Bolsa familia" },
    { value: "BPC", label: "BPC" },
    { value: "Auxilio aluguel", label: "Auxilio aluguel" },
    { value: "Cesta basica", label: "Cesta basica" },
    { value: "Vale gas", label: "Vale gas" },
    { value: "Outro", label: "Outro" },
  ],
} as const;

export const FINANCIAL_STATUS_OPTIONS = [
  { value: "Ativo", label: "Ativo" },
  { value: "Pausado", label: "Pausado" },
  { value: "Encerrado", label: "Encerrado" },
] as const;

export const FINANCIAL_CONTRACT_TYPE_OPTIONS = [
  { value: "CLT", label: "CLT" },
  { value: "PJ", label: "PJ" },
  { value: "Informal", label: "Informal" },
  { value: "Autonomo", label: "Autonomo" },
  { value: "Outro", label: "Outro" },
] as const;
