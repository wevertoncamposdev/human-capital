import type { UsageDocumentationSection } from "@/components/UsageDocumentation/usage-documentation.helpers";

export const DEPOSIT_ITEM_UNIT = [
  { label: "Unidade (un)", value: "un" },
  { label: "Kit", value: "kit" },
  { label: "Caixa (cx)", value: "cx" },
  { label: "Par", value: "par" },
  { label: "Conjunto", value: "conj" },
  { label: "Pacote (pct)", value: "pct" },
  { label: "Rolo", value: "rolo" },
  { label: "Metro (m)", value: "m" },
] as const;

export const DEPOSIT_ITEM_GROUP = [
  { label: "Material Escolar", value: "Material Escolar" },
  { label: "Brinquedos", value: "Brinquedos" },
  { label: "Roupas", value: "Roupas" },
  { label: "Calçados", value: "Calçados" },
  { label: "Material de Oficina", value: "Material de Oficina" },
  { label: "Material Esportivo", value: "Material Esportivo" },
  { label: "Livros", value: "Livros" },
  { label: "Material de Escritório", value: "Material de Escritório" },
  { label: "Eletrônicos", value: "Eletrônicos" },
  { label: "Mobília", value: "Mobília" },
  { label: "Outros", value: "Outros" },
] as const;

export const DEPOSIT_DEFAULT_SECTOR = "Geral" as const;
export const DEPOSIT_DEFAULT_UNIT = "un" as const;

export const DEPOSIT_EXIT_ENTRY_AUTO_VALUE = "__auto__" as const;
export const DEPOSIT_ENTRY_DONOR_NONE_VALUE = "__none__" as const;

export const DEPOSIT_EXIT_TYPE_OPTIONS = [
  "LOAN",
  "FINAL_REMOVAL",
  "TRANSFER",
  "ADJUSTMENT",
  "LOSS",
] as const;

export const DEPOSIT_EXIT_TYPE_LABELS: Record<
  (typeof DEPOSIT_EXIT_TYPE_OPTIONS)[number],
  string
> = {
  LOAN: "Empréstimo",
  FINAL_REMOVAL: "Doação",
  TRANSFER: "Transferência",
  ADJUSTMENT: "Ajuste",
  LOSS: "Perda",
};

export const DEPOSIT_DONOR_TYPE_LABELS: Record<"PERSON" | "COMPANY", string> = {
  PERSON: "Pessoa",
  COMPANY: "Empresa",
};

export const DEPOSIT_AUDIT_FIELD_LABELS: Record<string, string> = {
  name: "Nome",
  group: "Grupo de objetos",
  defaultSector: "Setor",
  unit: "Unidade",
  minStock: "Estoque mínimo",
  notes: "Notas internas",
};

export const DEPOSIT_DONOR_AUDIT_FIELD_LABELS: Record<string, string> = {
  name: "Nome",
  type: "Tipo",
  contact: "Contato",
  avatarUrl: "Foto",
};

export const DEPOSIT_ENTRY_AUDIT_FIELD_LABELS: Record<string, string> = {
  donorId: "Fonte",
  sector: "Setor",
  quantity: "Quantidade",
  unit: "Unidade",
  entryDate: "Data da entrada",
  expiryDate: "Data limite",
  notes: "Notas",
  reversalOfExitId: "Retorno de saída",
};

export const DEPOSIT_EXIT_AUDIT_FIELD_LABELS: Record<string, string> = {
  sector: "Setor",
  quantity: "Quantidade",
  unit: "Unidade",
  exitDate: "Data da saída",
  type: "Tipo de saída",
  destinationName: "Destino",
  destinationType: "Tipo de destino",
  expectedReturnAt: "Retorno previsto",
  returnedAt: "Retornado em",
  returnedQuantity: "Quantidade retornada",
  returnNotes: "Notas do retorno",
  notes: "Notas",
  reversalOfEntryId: "Estorno de entrada",
};

export const DEPOSIT_SCREEN_STATE_KEYS = {
  stock: "screenState:deposit.stock",
  donors: "screenState:deposit.donors",
  history: "screenState:deposit.history",
  itemsDetail: "screenState:deposit.items.detail",
  donorsDetail: "screenState:deposit.donors.detail",
  entriesDetail: "screenState:deposit.entries.detail",
  exitsDetail: "screenState:deposit.exits.detail",
} as const;

export const DEPOSIT_ROUTES = {
  root: "/deposit",
  stock: "/deposit/stock",
  donors: "/deposit/donors",
  donorsNew: "/deposit/donors/new",
  history: "/deposit/history",
  entries: "/deposit/entries",
  entriesNew: "/deposit/entries/new",
  exits: "/deposit/exits",
  exitsNew: "/deposit/exits/new",
  items: "/deposit/items",
  itemsNew: "/deposit/items/new",
} as const;

export const DEPOSIT_ACTION_IDS = {
  stock: "deposit.stock",
  donors: "deposit.donors",
  donorsNew: "deposit.donors.new",
  donorsDetail: "deposit.donors.detail",
  history: "deposit.history",
  entriesNew: "deposit.entries.new",
  entriesDetail: "deposit.entries.detail",
  exitsNew: "deposit.exits.new",
  exitsDetail: "deposit.exits.detail",
  itemsNew: "deposit.items.new",
  itemsDetail: "deposit.items.detail",
} as const;

export const DEPOSIT_SEARCH_VIEW_IDS = {
  stock: "deposit.stock.search",
  donors: "deposit.donors.search",
  history: "deposit.history.search",
  entries: "deposit.entries.search",
  exits: "deposit.exits.search",
} as const;

export const DEPOSIT_USAGE_TEXT = {
  items: {
    title: "Depósito / Objetos",
    sections: [
      {
        title: "Dados principais",
        items: [
          "Edite nome, grupo, setor padrão, unidade e estoque mínimo diretamente no detalhe.",
          "Use as abas Entradas, Saídas e Histórico para acompanhar o fluxo operacional do objeto.",
        ],
      },
      {
        title: "Movimentações",
        items: [
          "Use Nova entrada para registrar recebimentos do objeto.",
          "Use Nova saída para registrar empréstimos, transferências, doações ou ajustes.",
        ],
      },
      {
        title: "Painel lateral",
        items: [
          "Comentários, notas internas, tags, anexos e auditoria ficam concentrados no painel lateral.",
          "O contexto resume saldo, grupo, setor padrão e status do objeto.",
        ],
      },
    ] satisfies UsageDocumentationSection[],
  },
  donors: {
    title: "Depósito / Fontes",
    sections: [
      {
        title: "Dados principais",
        items: [
          "Edite nome, tipo, contato e foto da fonte diretamente no detalhe.",
          "Use a aba Doações para abrir as entradas vinculadas à fonte.",
        ],
      },
      {
        title: "Painel lateral",
        items: [
          "Comentários, notas internas, tags, anexos e auditoria ficam no painel lateral.",
          "O contexto resume tipo e contato da fonte.",
        ],
      },
    ] satisfies UsageDocumentationSection[],
  },
  entries: {
    title: "Depósito / Entradas",
    sections: [
      {
        title: "Dados principais",
        items: [
          "Edite setor, quantidade, unidade, fonte e notas diretamente no detalhe.",
          "Use a aba Saídas vinculadas para abrir as saídas consumidas a partir desta entrada.",
        ],
      },
      {
        title: "Painel lateral",
        items: [
          "Comentários, notas internas, tags, anexos e auditoria ficam concentrados no painel lateral.",
          "O contexto resume objeto, setor e status da entrada.",
        ],
      },
    ] satisfies UsageDocumentationSection[],
  },
  exits: {
    title: "Depósito / Saídas",
    sections: [
      {
        title: "Dados principais",
        items: [
          "Edite entrada de origem, setor, quantidade, data, tipo, destino e retorno diretamente no detalhe.",
          "Use a aba Entradas vinculadas para ver os lotes consumidos por esta saída.",
        ],
      },
      {
        title: "Painel lateral",
        items: [
          "Comentários, notas internas, tags, anexos e auditoria ficam concentrados no painel lateral.",
          "O contexto resume objeto, setor e tipo da saída.",
        ],
      },
    ] satisfies UsageDocumentationSection[],
  },
} as const;
