import type { SelectOption } from "@/web-client/forms/types";
import type { UsageDocumentationSection } from "@/components/UsageDocumentation/usage-documentation.helpers";
import type { ProgramStatus, ProgramType } from "@/modules/programs/api";

export const PROGRAM_TYPE_LABELS: Record<ProgramType, string> = {
  SCFV: "SCFV",
  PAIF: "PAIF",
  PAEFI: "PAEFI",
  CULTURAL: "Cultura",
  QUALIFICATION: "Qualificação",
  OTHER: "Outro",
};

export const PROGRAM_STATUS_LABELS: Record<ProgramStatus, string> = {
  PLANNED: "Planejado",
  ACTIVE: "Ativo",
  CLOSED: "Encerrado",
};

export const PROGRAM_TYPE_OPTIONS: SelectOption[] = (
  Object.entries(PROGRAM_TYPE_LABELS) as Array<[ProgramType, string]>
).map(([value, label]) => ({ value, label }));

export const PROGRAM_STATUS_OPTIONS: SelectOption[] = (
  Object.entries(PROGRAM_STATUS_LABELS) as Array<[ProgramStatus, string]>
).map(([value, label]) => ({ value, label }));

export const PROGRAM_USAGE_TEXT = {
  detail: {
    title: "Programas",
    sections: [
      {
        title: "Dados principais",
        items: [
          "Edite nome, tipo, status, vigência e descrição diretamente no detalhe.",
          "Use o detalhe como base do programa antes de organizar os projetos vinculados.",
        ],
      },
      {
        title: "Projetos",
        items: [
          "Use a aba Projetos para abrir registros vinculados ou criar um novo projeto a partir do programa.",
          "A contagem da aba já mostra o volume de projetos vinculados.",
        ],
      },
      {
        title: "Painel lateral",
        items: [
          "Comentários, notas internas, tags, anexos e auditoria ficam concentrados no painel lateral.",
          "O contexto resume tipo, status, vigência e quantidade de projetos.",
        ],
      },
    ] satisfies UsageDocumentationSection[],
  },
} as const;
