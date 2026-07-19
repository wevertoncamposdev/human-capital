# Matriz de Auditoria do Marco Zero 1.0

Este arquivo define como preencher e operar a matriz de auditoria por modulo/tela/camada.

Arquivos operacionais:

- `docs/marco-zero-1.0-audit-matrix.csv`
- `docs/module-canonical-checklist.md`
- `docs/marco-zero-1.0-implementation-plan.md`

## Objetivo

Garantir que cada item auditado do projeto tenha:

- status objetivo (`PASSA`, `FALHA`, `NA`)
- severidade e prioridade
- dono
- evidencia
- destino claro para fechamento do marco zero `1.0`

## Escopo da matriz

A matriz inclui tres escopos:

- `frontend_screen`: uma linha por tela/rota
- `backend_module`: uma linha por modulo backend
- `database_domain`: uma linha por dominio de dados no Prisma

## Regras de preenchimento

1. Preencher `status` com:
- `PASSA`: atende integralmente ao contrato canonico
- `FALHA`: nao atende (obrigatorio abrir acao)
- `NA`: nao se aplica ao item

2. Preencher `severity` apenas para `FALHA`:
- `critica`
- `alta`
- `media`
- `baixa`

3. Preencher `owner` e `due_date` para toda `FALHA`.

4. Preencher `evidence` com referencia objetiva:
- caminho de arquivo
- rota
- comando e resultado (`lint`, `build`, `smoke`)
- ticket/PR

5. Preencher `decision` ao final:
- `corrigir_1_0`
- `remover_1_0`
- `isolar_legado`
- `pos_1_0` (permitido apenas sem impacto no contrato canonico)

6. Qualquer uso ativo de `grade tabular legada`, `renderizador legado de formularios` ou modulo removido do canonico deve ser marcado como `FALHA`.

7. Qualquer `relation operacional` fora do `ListView` deve ser marcada como `FALHA`.

## Campos da planilha

- `scope`: `frontend_screen`, `backend_module`, `database_domain`
- `wave`: `A`, `B`, `C`, `D` conforme plano de implementacao
- `module`: modulo principal
- `feature`: feature/tela/subdominio
- `item_id`: identificador estavel da linha
- `route_or_target`: rota da tela ou alvo tecnico
- `canonical_area`: area principal (`list`, `detail`, `side`, `relations`, `api`, `schema`, `quality`)
- `status`: `PASSA`, `FALHA`, `NA`
- `severity`: `critica`, `alta`, `media`, `baixa`
- `owner`: responsavel
- `due_date`: data limite (`YYYY-MM-DD`)
- `evidence`: prova objetiva
- `notes`: observacoes tecnicas
- `decision`: destino da pendencia

## Politica de bloqueio

Bloqueia liberacao do marco zero:

- qualquer `FALHA` de severidade `critica`
- item sem `owner` ou sem `due_date`
- item sem `decision`
- modulo sem checklist de aceite final

## Fluxo diario recomendado (Dia 1 e Dia 2)

Ordem obrigatoria de revisao:

1. `Onda A` (modulos simples e diretos)
2. `Onda B` (modulos intermediarios)
3. `Onda C` (modulos com regra de negocio complexa)
4. `Onda D` (legados para remover/isolar)
5. `Onda E` (relation operacional e padrao de actions)
6. `Onda F` (residuos ativos de list/detail legados)
7. `Onda G` (fluxos publicos/core e features historicas)
8. `Onda H` (gates finais de qualidade e liberacao)

Fluxo de execucao:

1. Rodar triagem das linhas de `frontend_screen`.
2. Rodar triagem dos `backend_module` ligados ao mesmo modulo.
3. Rodar triagem dos `database_domain` do modulo.
4. Classificar severidade e preencher dono/prazo.
5. Consolidar backlog diario por onda.

Triagem obrigatoria adicional por tela:

- existe `grade tabular legada` no fluxo canonico ativo?
- existe `renderizador legado de formularios` no fluxo canonico ativo?
- existe modulo removido ou rota legada visivel no fluxo ativo?
- relation operacional usa `ListView` com filtros, selecao e acoes no proprio slot?

## Fechamento por onda

Cada onda deve ter decisao explicita ao fim da passada:

- `FECHADA`: todas as linhas da onda estao em `PASSA` ou `NA`
- `NAO_FECHADA`: existe ao menos uma linha em `FALHA`

Regra operacional:

- nao marcar onda como fechada com `FALHA` aberta
- registrar no fechamento da onda quais itens impedem avancar com seguranca
- manter a proxima onda em `PENDENTE` ate a decisao da onda atual
- nao considerar encerrada uma onda que ainda exponha `grade tabular legada`, `renderizador legado de formularios` ou modulo removido no fluxo canonico ativo

## Definicao de pronto da auditoria

A auditoria e considerada pronta quando:

- 100% das linhas estao com `status`
- 100% das `FALHA` tem `owner`, `due_date`, `decision`
- matriz esta alinhada com checklist 1.0 e plano de implementacao
- backlog transversal marcado como `pos_1_0` aparece apenas em linha de `quality`, com justificativa explicita e sem impacto no contrato canonico ativo

