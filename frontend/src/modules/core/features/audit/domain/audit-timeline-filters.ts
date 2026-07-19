import type { FilterSchema } from "@/lib/filters/types";
import type { AdminAuditLogAction, AdminUser } from "@/features/admin/api";

export type AuditTimelineFilterValues = {
  q: string;
  entity: string;
  userId: string;
  action: AdminAuditLogAction | "all";
  from: string;
  to: string;
};

export const auditTimelineDefaultFilters: AuditTimelineFilterValues = {
  q: "",
  entity: "",
  userId: "all",
  action: "all",
  from: "",
  to: "",
};

export function buildAuditTimelineFilterSchema(
  users: AdminUser[],
): FilterSchema<AuditTimelineFilterValues> {
  return [
    {
      key: "q",
      type: "text",
      label: "Busca",
      placeholder: "Buscar em tudo (requestId, user, ip, entity...)",
      apiKey: "search",
    },
    {
      key: "entity",
      type: "text",
      label: "Entidade",
      placeholder: "Ex.: Person, PantryExit...",
    },
    {
      key: "action",
      type: "select",
      label: "Ação",
      options: [
        { value: "all", label: "Todas" },
        { value: "CREATE", label: "Criação" },
        { value: "UPDATE", label: "Atualização" },
        { value: "DELETE", label: "Exclusão" },
      ],
      omitWhen: (value) => value === "all",
    },
    {
      key: "userId",
      type: "select",
      label: "Usuário",
      options: [
        { value: "all", label: "Todos" },
        ...users.map((user) => ({
          value: user.id,
          label: user.name || user.email,
        })),
      ],
      omitWhen: (value) => value === "all",
    },
    { key: "from", type: "date", label: "De" },
    { key: "to", type: "date", label: "Até" },
  ];
}
