export type DepositPagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type DepositValidityStatus =
  | "Normal"
  | "Atencao"
  | "Alerta"
  | "Urgente"
  | "Vencido"
  | "Sem validade";

