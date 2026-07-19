export type PantryPagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export type PantryValidityStatus =
  | "Normal"
  | "Atencao"
  | "Alerta"
  | "Urgente"
  | "Vencido"
  | "Sem validade";

