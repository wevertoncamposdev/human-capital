# Human Capital

Sistema de gestão de capacidade operacional de equipes, construído sobre uma arquitetura multi-tenant de referência (Next.js + NestJS + PostgreSQL/Prisma), adaptada a partir de uma base de produção já validada.

## O produto: Capital Humano

**Capital Humano** é a implementação do **Método FAROL** — um framework de gestão operacional voltado a organizações com equipes multidisciplinares (nasceu pensando em Organizações da Sociedade Civil, mas se aplica a qualquer time cuja carga de trabalho vai além de uma lista de tarefas).

A premissa central: o recurso mais escasso de uma equipe não é a lista de tarefas, é o **tempo disponível**. A maioria dos sistemas de gestão pergunta "o que precisa ser feito?". O Capital Humano pergunta primeiro **"a equipe tem capacidade pra receber isso?"** — e só depois organiza a execução.

Isso inverte a lógica de um gestor de tarefas convencional:

| Gestor de tarefas tradicional | Capital Humano (Método FAROL) |
|---|---|
| Tarefa é criada e atribuída | Demanda é registrada e passa por **análise de impacto** antes de virar responsabilidade de alguém |
| Foco em "o que falta fazer" | Foco em "quanto tempo isso consome" e "de onde esse tempo vai sair" |
| Prioridade é subjetiva/urgência do momento | Prioridade é classificada (alta/média/baixa) com critério explícito |
| Sobrecarga é descoberta depois que já aconteceu | Capacidade operacional da equipe é um dado visível, comparado à demanda antes de aceitá-la |

### Os 5 pilares (F-A-R-O-L)

| Pilar | Significado | O que vira no sistema |
|---|---|---|
| **F** | Fluxo das demandas | Estado da demanda: `nova → análise de impacto → planejada → em execução → concluída/replanejada` |
| **A** | Análise de impacto | Formulário obrigatório antes de aceitar uma demanda: objetivo, impactados, prazo, horas necessárias, atividades afetadas, responsável |
| **R** | Recursos e capacidade operacional | Capacidade semanal de cada pessoa/equipe (horas totais menos alocação já comprometida) |
| **O** | Organização das prioridades | Classificação de toda demanda em alta/média/baixa |
| **L** | Liderança e alinhamento | Visão de coordenação sobre sobrecarga, risco operacional e necessidade de apoio entre equipes |

### Ciclo operacional que o sistema precisa suportar

```
Pulso Diário (4 perguntas rápidas por pessoa)
   ↓
Banco de Demandas (toda atividade é registrada, nada roda "por fora")
   ↓
Análise de Impacto (obrigatória antes de qualquer demanda entrar na rotina)
   ↓
Planejamento Semanal (alinhamento de equipe no início da semana)
   ↓
Execução das Atividades
   ↓
Avaliação da Semana (o que concluiu, o que ficou, o que virou obstáculo)
   ↓
Replanejamento
```

### Regras de negócio inegociáveis do método (viram validações no sistema)

1. Nenhuma demanda nasce sem responsável definido
2. Nenhuma demanda entra na agenda sem passar por análise de impacto
3. Toda demanda tem uma prioridade classificada
4. Toda pessoa/equipe tem capacidade operacional limitada e visível
5. Obstáculos devem ser identificáveis o quanto antes (não só no fechamento da semana)
6. Cadência fixa: comunicação é diária (pulso), planejamento é semanal

### Consequência pra modelagem de dados

Isso desloca o centro do domínio de "cadastro de pessoa" pra um conjunto de entidades novas que **não existem na base de referência** e precisam ser desenhadas do zero:

- `Demanda` (fluxo de estados F-A-R-O-L)
- `AnaliseDeImpacto` (1:1 com a demanda, obrigatória antes da transição de estado)
- `CapacidadeOperacional` (horas disponíveis por pessoa/equipe, por período)
- `PulsoDiario` (registro leve, diário, por pessoa)
- `PlanejamentoSemanal` / `AvaliacaoSemanal`
- `Equipe` (agrupamento de pessoas — reaproveita a ideia de `people-groups` da base, mas com semântica de capacidade, não de "segmento de atendidos")

Módulos como `tasks` (`TaskOrganizerTask`) da base de referência, que eu tinha descartado por parecerem genéricos demais, valem uma segunda olhada agora — a estrutura de subtask/checklist/dependência pode servir de esqueleto técnico pra `Demanda`, mesmo que as regras de negócio (análise de impacto, capacidade) sejam construídas por cima.

## Stack

- **Frontend:** Next.js (App Router), TypeScript, TanStack Table
- **Backend:** NestJS, Prisma, PostgreSQL
- **Autenticação:** JWT + MFA (TOTP), sessões e dispositivos confiáveis
- **Multi-tenant:** isolamento por `Tenant` em todas as entidades de domínio

## Visão geral da arquitetura

O projeto é dividido em duas grandes camadas: um **núcleo de infraestrutura** (auth, tenancy, auditoria, RBAC) que não muda entre domínios de negócio, e **módulos de domínio** que implementam as regras específicas do capital humano (colaboradores, cargos, etc). Essa separação é o que permite criar novos módulos rapidamente sem reescrever autenticação, permissões ou o mecanismo de listagem/detalhe a cada vez.

---

## Backend

### `core/` — infraestrutura compartilhada

| Pasta | Responsabilidade |
|---|---|
| `auth/` | Login, estratégias (JWT/local), guards, MFA (TOTP), decorators de rota protegida |
| `tenancy/` | Resolução e isolamento do tenant em cada requisição |
| `authorization/` | RBAC — checagem de permissões por role |
| `audit/` | Registro de auditoria (`AuditLog`, `AccessLog`) de ações sensíveis |
| `pii/` | Tratamento de dados pessoais sensíveis |
| `request-context/` | Contexto de requisição (usuário/tenant atuais) disponível via injeção, sem precisar repassar parâmetro em cada service |
| `prisma/` | Cliente Prisma e configuração de acesso ao banco |
| `rate-limit/`, `email/`, `files/`, `cep/` | Utilitários transversais |

**Por que isso existe separado de "módulos":** um módulo de domínio (ex: `employees`) nunca deveria precisar saber *como* autenticação ou auditoria funcionam por dentro — ele apenas consome guards e decorators do `core`. Isso é o que torna um módulo novo "barato" de criar: a parte difícil (segurança, multi-tenant) já está resolvida uma vez só.

### `modules/` — domínio de negócio

Cada módulo segue o mesmo padrão de arquivos: `*.module.ts` (registro NestJS), `*.controller.ts` (rotas HTTP), `*.service.ts` (regra de negócio), opcionalmente `*.filters.ts` (query de listagem) e `*.constants.ts`.

Módulos reaproveitados da base (infraestrutura de acesso, não muda com o domínio):

- `users` — autenticação e conta de acesso
- `people` — cadastro de pessoa física (colaborador)
- `roles`, `permissions` — controle de acesso baseado em papéis
- `tenants`, `registration` — conta/organização e onboarding

Módulos novos, específicos do Método FAROL, a serem construídos (não existem na base de referência):

- `equipes` — agrupamento de pessoas com capacidade operacional própria
- `capacidade` — horas disponíveis por pessoa/equipe, por período
- `demandas` — fluxo F-A-R-O-L completo (estado, análise de impacto, prioridade)
- `pulso-diario` — registro diário das 4 perguntas por pessoa
- `planejamento-semanal` / `avaliacao-semanal`

Um módulo novo é criado replicando a estrutura padrão (`*.module.ts`/`*.controller.ts`/`*.service.ts`) e se conectando ao `core` via os guards/decorators existentes — sem tocar em auth, tenancy ou audit.

---

## Frontend

O frontend segue uma arquitetura de **shells reutilizáveis**: em vez de cada tela de listagem/detalhe ser escrita do zero, existe um conjunto de componentes genéricos que qualquer módulo novo configura via um "contrato" (`moduleDefinition`), e a tela nasce pronta — busca, filtros, paginação, formulário e visualização em detalhe inclusos.

### Camadas (`web-client/`)

| Camada | O que faz |
|---|---|
| **DataProvider** | Interface genérica (`search`/`read`/`create`/`update`/`delete`) que isola a UI de como o `apiServer` é chamado. Qualquer módulo troca de fonte de dados sem a tela saber |
| **TypeView** | Componentes de visualização de lista (tabela, cards, calendário, timeline) plugados a um `ViewSwitcher` — o usuário troca o modo de visualização sem trocar de tela |
| **PainelSearchShell** | Busca + menu de busca salva + construtor de filtro avançado + painel de controle da página, tudo unificado |
| **RecordListHost** | Une TypeView + PainelSearchShell numa única shell de listagem, com a URL como estado serializado (filtros, página, ordenação vivem na URL, não em estado local) |
| **FormView** | Formulário de criação/edição com autosave |
| **DetailShell** | Motor de composição da tela de detalhe de um registro |
| **MetaDataShell** | Painel lateral padrão de metadados do registro (criado por, atualizado em, tags, etc) |
| **RelationShell** | Lista e tabela de registros relacionados dentro da tela de detalhe |
| **Registry + `defineRecordModule`** | Contrato tipado onde cada módulo declara seus campos, colunas, filtros e comportamento — as shells acima leem esse contrato para se montar sozinhas |

### Por que Server Components chamam `apiServer` diretamente

Não existem Route Handlers (`app/api/.../route.ts`) como camada intermediária. A chamada é direta do Server Component para o `apiServer`, no mesmo processo — isso preserva o encaminhamento de cookies/sessão de autenticação. Um Route Handler chamado via `fetch` cria uma nova requisição HTTP e perde esse contexto, quebrando `getSessionToken()`. A URL continua sendo a fonte de verdade do estado da tela (filtros, página), só que sem essa camada extra.

---

## Como criar um módulo novo (visão geral)

1. **Backend:** criar pasta em `modules/<nome>` com module/controller/service seguindo o padrão existente; registrar no `AppModule`; proteger rotas com os guards de `core/auth`
2. **Schema:** adicionar o model no `schema.prisma`, migrar
3. **Frontend:** declarar o contrato do módulo via `defineRecordModule` (campos, colunas, filtros)
4. **Composição:** conectar o contrato ao `RecordListHost` e `DetailShellEngine` — a tela de listagem e detalhe nascem prontas a partir da configuração, sem escrever UI do zero

---

## Origem

Este projeto usa como base arquitetural o repositório [`TerceiroGestor/system_development`](https://github.com/TerceiroGestor/system_development), do qual foi extraído o núcleo de infraestrutura (auth, tenancy, RBAC, auditoria) e a arquitetura de frontend baseada em shells reutilizáveis. Os módulos de domínio específicos de gestão social/terceiro setor da base original não fazem parte deste projeto.
