# Plano de Implementacao do Marco Zero 1.0

Este plano converte o contrato do `Marco Zero 1.0` em execucao tecnica para frontend, backend e banco de dados.

Documento base:

- `docs/marco-zero-1.0.md`
- `docs/canonical-web-client-standard.md`
- `docs/canonical-business-structure.md`
- `docs/module-canonical-checklist.md`

## Escopo total do plano

Frontend (modulos atuais):

- `actions`
- `core`
- `deposit`
- `nav`
- `organization`
- `pantry`
- `people`
- `people-groups`
- `people-segments`
- `person`
- `programs`
- `projects`
- `tasks`

Backend (modulos atuais):

- `actions`
- `dashboard`
- `deposit`
- `pantry`
- `people`
- `people-groups`
- `people-segments`
- `permissions`
- `programs`
- `project-structure`
- `projects`
- `registration`
- `roles`
- `tasks`
- `tenants`
- `users`

## Principios de execucao

- nenhuma mudanca entra sem checklist de aceite `PASSA/FALHA`
- frontend, backend e banco evoluem juntos por modulo
- cada relacao deve ter cardinalidade declarada (`1:1`, `1:N`, `N:1`, `N:N`)
- modulo removido: excluir do fluxo canonico sem compatibilidade permanente
- sem telas paralelas fora de `RecordListHost`, `DetailShellEngine` e `StandardDetailMetadataSide`
- `grade tabular legada` e `renderizador legado de formularios` sao legados no fluxo canonico ativo e devem ser eliminados

## Fase 0: Baseline e governanca (Dia 1)

1. Congelar escopo do marco zero.
2. Publicar planilha de auditoria por modulo e tela.
3. Definir donos por trilha:
4. Trilhas:
- `Frontend Canonico`
- `Backend Contratos`
- `Banco e Migracoes`
5. Definir gates obrigatorios no merge:
- smoke de modulo
- lint frontend/backend
- build frontend/backend

Entregaveis da fase:

- matriz de auditoria criada
- backlog priorizado por severidade
- politica de bloqueio no merge definida

## Fase 1: Auditoria tecnica 100% (Dia 1-2)

1. Inventariar todas as rotas de list/new/detail por modulo.
2. Marcar aderencia de cada tela no checklist 1.0.
3. Mapear divergencias de cardinalidade por relacao.
4. Mapear divergencias API x UI x schema.
5. Classificar cada pendencia:
- `Critica`
- `Alta`
- `Media`
- `Baixa`

Entregaveis da fase:

- matriz de aderencia completa
- lista de pendencias por modulo com dono e prazo

## Fase 2: Endurecimento da plataforma canonica (Dia 2-3)

### Frontend

1. Expandir validacao de contratos de modulo para incluir:
- regras de list/detail/side
- regras de relations
- regras de `relation operacional`
- metadados de cardinalidade
2. Criar starter canonico para modulo novo (list + detail + relations + side).
3. Padronizar componentes de relation para `1:1`, `1:N`, `N:1`, `N:N`.
4. Expandir `ListView` e contratos relacionais para cobrir:
- filtros no slot relacional
- selecao em lote
- acoes por linha
- salvamento explicito
- metricas compactas sem card duplicado

### Backend

1. Padronizar DTOs e endpoints por tipo de relacao:
- `upsert` para `1:1`
- `create/list by parent` para `1:N`
- `attach/detach` ou `create/end` para `N:N`
2. Garantir respostas consistentes para UI canonica.
3. Unificar mensagens de erro e validacao de integridade relacional.

### Banco

1. Auditar constraints de todas as relacoes.
2. Criar plano de migracoes para:
- FK unica em `1:1`
- indices obrigatorios em `1:N` e `N:1`
- entidade associativa explicita em `N:N`
3. Planejar backfill quando houver reestruturacao.

Entregaveis da fase:

- plataforma pronta para impedir reincidencia de desvio

## Fase 3: Canonizacao por ondas (Dia 3-5)

Regra de execucao:

- cada onda deve receber status explicito `FECHADA` ou `NAO_FECHADA`
- uma onda so fecha quando todas as suas linhas na matriz estiverem em `PASSA` ou `NA`
- se existir `FALHA`, a onda permanece aberta com backlog objetivo de correcao

## Status atual das ondas

- `Onda A`: `FECHADA` em `2026-03-27`
- `Onda B`: `FECHADA` em `2026-03-27`
- `Onda C`: `FECHADA` em `2026-03-27`
- `Onda D`: `FECHADA` em `2026-03-27`
- `Onda E`: `FECHADA` em `2026-03-27`
- `Onda F`: `FECHADA` em `2026-04-07`
- `Onda G`: `FECHADA` em `2026-04-07`
- `Onda H`: `FECHADA` em `2026-04-07`

Evidencias do fechamento da `Onda A`:

- matriz `docs/marco-zero-1.0-audit-matrix.csv` sem `FALHA` na onda `A`
- lint direcionado dos alvos canonicos da onda executado sem erros e sem warnings
- telas simples de `core` e `tasks` alinhadas em `detail`, `side` e `relations`

Evidencias do fechamento da `Onda B`:

- matriz `docs/marco-zero-1.0-audit-matrix.csv` com todas as linhas da onda `B` em `PASSA`
- `frontend lint` direcionado da onda executado sem erros
- `frontend build` executado com sucesso em `2026-03-27`
- `backend build` executado com sucesso em `2026-03-27`
- contratos e telas de `people-segments`, `pantry`, `deposit` e `programs` alinhados em `list`, `detail`, `side`, `relations` e textos canonicos

Evidencias do fechamento da `Onda C` em `2026-03-27`:

- matriz `docs/marco-zero-1.0-audit-matrix.csv` sem `FALHA` na onda `C`
- `frontend build` executado com sucesso em `2026-03-27`
- `backend build` executado com sucesso em `2026-03-27`
- frontend de `people`, `projects` e `actions` canonizado nas rotas ativas, com elegiveis, grupos e presencas operando sobre `people groups` e `project groups`
- fluxo ativo de `actions` e `project-structure` deixou de depender da estrutura legada removida para selecao, matricula e presenca
- a estrutura legada removida deixou de bloquear o fechamento do fluxo institucional canonico

Evidencias do fechamento da `Onda D` em `2026-03-27`:

- matriz `docs/marco-zero-1.0-audit-matrix.csv` sem `FALHA` na onda `D`
- `backend build` executado com sucesso em `2026-03-27`
- `frontend build` executado com sucesso em `2026-03-27`
- schema Prisma ativo sem tabelas ou relacoes da estrutura removida
- `seed.ts` e scripts auxiliares alinhados ao schema canonico sem dependencia da estrutura removida
- rotas legadas da estrutura removida excluidas do frontend

Evidencias do fechamento da `Onda E` em `2026-03-27`:

- matriz `docs/marco-zero-1.0-audit-matrix.csv` sem `FALHA` na onda `E`
- `frontend lint` direcionado da onda executado sem erros
- `frontend tsc --noEmit` executado com sucesso em `2026-03-27`
- `frontend build` executado com sucesso em `2026-03-27`
- `backend build` executado com sucesso em `2026-03-27`
- `RelationSlot` canonico expandido para suportar relation operacional com filtros, metricas compactas, selecao e acoes em lote
- `actions > participantes` e `actions > qualidade` migrados para `ListView` canonico no shell ativo
- `project-action-attendances-card` migrado para `ListView` e `action-quality-card` removido do fluxo ativo

Evidencias do fechamento da `Onda F` em `2026-04-07`:

- matriz `docs/marco-zero-1.0-audit-matrix.csv` sem `FALHA` na onda `F`
- residuos ativos de `people`, `projects`, `programs` e logs de `core` removidos do fluxo canonico
- busca no repositorio sem ocorrencias nominais dos componentes legados removidos
- `frontend lint` e `frontend build` aprovados em `2026-04-07`

Evidencias do fechamento da `Onda G` em `2026-04-07`:

- matriz `docs/marco-zero-1.0-audit-matrix.csv` sem `FALHA` na onda `G`
- fluxos publicos, autenticacao, cadastro e perfil alinhados ao formulario canonico reutilizavel
- residuos historicos em `frontend/src/features` deixaram de depender do renderizador legado
- `frontend lint` e `frontend build` aprovados em `2026-04-07`

Evidencias do fechamento da `Onda H` em `2026-04-07`:

- matriz `docs/marco-zero-1.0-audit-matrix.csv` sem `FALHA` na onda `H`
- `frontend lint` e `frontend build` aprovados em `2026-04-07`
- `backend build` aprovado em `2026-04-07`
- `prisma migrate status` aprovado em `2026-04-07` com `SHADOW_DATABASE_URL` configurado
- backlog global de `lint` backend registrado como debito transversal `pos_1_0`, sem bloquear o contrato canonico 1.0

## Onda A: Fundacao simples (prioridade inicial)

Modulos:

- `core`
- `users`
- `roles`
- `permissions`
- `tenants`
- `registration`
- `dashboard`
- `tasks`

Passos por modulo:

1. Ajustar list para host canonico e colunas base.
2. Ajustar detail para shell canonico unico (`new/edit`).
3. Ajustar side e abas fixas.
4. Ajustar relations e cardinalidade.
5. Alinhar endpoints e schema.
6. Executar checklist e corrigir falhas.

## Onda B: Fluxo operacional intermediario

Modulos:

- `people-segments`
- `pantry`
- `deposit`
- `programs`

Passos por modulo:

1. Repetir pacote de canonizacao da Onda A.
2. Revisar relacoes complexas com tabelas associativas.
3. Eliminar variacoes de UX entre modulos equivalentes.

## Onda C: Fluxo institucional complexo

Modulos:

- `people`
- `people-groups`
- `projects`
- `project-structure`
- `actions`

Passos por modulo:

1. Canonizar fluxos com maior carga de regra de negocio.
2. Padronizar relacoes complexas e cardinalidade ponta a ponta.
3. Revisar contratos API/DB que suportam regras institucionais.

## Onda D: Legados e consolidacao

Itens:

- `person`
- `organization`
- `nav`

Passos:

1. Classificar cada item como:
- remover
- isolar como legado fora do fluxo canonico
- migrar para modulo canonico equivalente
2. Remover referencias no registro de modulo/acoes de janela quando aplicavel.
3. Eliminar dependencia ativa em telas de producao.

## Onda E: Relation operacional e padrao de actions

Itens:

- plataforma canonica de `relation operacional`
- `actions > participantes`
- `actions > qualidade`
- contrato de `attendance/quality` no modulo `actions`

Passos:

1. Expandir `DetailRelationConfig` e o renderer do shell para suportar filtros, metricas compactas, selecao e acoes operacionais.
2. Migrar `actions > participantes` para `RelationSlot` canonico com `ListView`, filtros e salvamento em lote.
3. Migrar `actions > qualidade` para `RelationSlot` canonico com `ListView`, nota, destaque e observacoes.
4. Eliminar `grade tabular legada` residual no fluxo ativo de presencas da acao.
5. Validar `lint`, `tsc`, `frontend build` e `backend build`.

## Legados tecnicos obrigatorios para fechar 1.0

- `grade tabular legada`: substituir por `ListView` em qualquer list/detail/relation do fluxo canonico ativo
- `renderizador legado de formularios`: substituir por formulario canonico dentro de `DetailShellEngine`
- modulo removido: excluir de navegacao, contrato de modulo, filtros, seletores, relations e regra ativa institucional

## Matriz de implementacao por camada

Para cada modulo, executar sempre nesta ordem:

1. Banco:
- corrigir schema e migracoes
- aplicar backfill
2. Backend:
- ajustar DTO/controller/service
- validar regras de cardinalidade
3. Frontend:
- ajustar contratos de modulo e telas
- alinhar relations com matriz canonica
4. Qualidade:
- checklist `PASSA/FALHA`
- smoke, lint e build

## Criterios de aceite por modulo

Um modulo so sai da esteira quando:

- checklist 1.0 sem falha critica
- relacoes com cardinalidade declarada e validada
- sem tela paralela fora do shell canonico
- smoke/lint/build aprovados
- evidencias anexadas na matriz de auditoria

## Sequencia recomendada de execucao (5 dias)

Dia 1:

1. Baseline e governanca
2. Inicio da auditoria total

Dia 2:

1. Fechar auditoria
2. Endurecer plataforma canonica
3. Preparar migracoes prioritarias

Dia 3:

1. Canonizar Onda A
2. Executar validacoes por modulo

Dia 4:

1. Canonizar Onda B
2. Iniciar Onda C

Dia 5:

1. Concluir Onda C
2. Tratar Onda D (legados)
3. Rodada final de checklist, smoke, lint e build
4. Fechar pendencias remanescentes com destino explicito
5. Liberar marco zero `1.0`

## Riscos e mitigacoes

Risco:

- divergencia entre regra de negocio e implementacao real

Mitigacao:

- review conjunto `produto + backend + frontend` antes de fechar cada onda

Risco:

- migracao de banco quebrar dados existentes

Mitigacao:

- migracoes incrementais + backfill + validacao de integridade

Risco:

- retorno de padrao antigo em modulo novo

Mitigacao:

- gate de contrato no build + starter canonico obrigatorio

## Definicao final de liberacao 1.0

Liberar o `Marco Zero 1.0` somente quando:

- todas as ondas estiverem concluidas ou com destino formal aprovado
- backlog critico zerado
- relatorio final de auditoria assinado
- frontend, backend e banco validados no fluxo canonico
- backlog transversal `pos_1_0` formalizado apenas quando nao impactar o contrato canonico liberado




