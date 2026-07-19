import type { SelectOption } from "@/web-client/forms/types";
import type { UsageDocumentationSection } from "@/components/UsageDocumentation/usage-documentation.helpers";

export const PEOPLE_SEGMENT_AUDIT_FIELD_LABELS = {
  name: "Nome",
  purpose: "Finalidade",
  category: "Categoria",
  description: "Descrição",
  ageMin: "Idade mínima",
  ageMax: "Idade máxima",
  isActive: "Status",
  internalNotes: "Notas internas",
  createdAt: "Criado em",
  updatedAt: "Atualizado em",
} as const;

export const PEOPLE_SEGMENT_PURPOSE_OPTIONS: SelectOption[] = [
  { value: "PUBLICO", label: "Público atendido" },
  { value: "EQUIPE", label: "Equipe institucional" },
];

export const PEOPLE_SEGMENT_CATEGORY_OPTIONS: SelectOption[] = [
  { value: "Público", label: "Público" },
  { value: "Equipe", label: "Equipe" },
  { value: "Relacionamento", label: "Relacionamento" },
  { value: "Rede", label: "Rede" },
  { value: "Outro", label: "Outro" },
];

export const PEOPLE_SEGMENT_USAGE_TEXT = {
  detail: {
    title: "Grupos de Pessoas",
    sections: [
      {
        title: "Dados principais",
        items: [
          "Edite nome, finalidade, categoria e status diretamente no detalhe.",
          "Preencha a faixa etária apenas quando ela fizer parte da regra do grupo.",
        ],
      },
      {
        title: "Participantes",
        items: [
          "Use a aba Pessoas para adicionar ou encerrar participantes vinculados.",
          "Clique em uma pessoa vinculada para abrir o detalhe relacionado.",
        ],
      },
      {
        title: "Painel lateral",
        items: [
          "Notas internas, histórico e contexto apoiam a consulta operacional do grupo.",
          "A auditoria reúne as alterações do grupo e dos vínculos.",
        ],
      },
    ] satisfies UsageDocumentationSection[],
  },
} as const;
