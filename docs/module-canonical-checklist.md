# Checklist de Modulo Canonico (Aceite 1.0)

Use este checklist para aprovar modulo no marco zero `1.0`.

Regra:

- cada item deve ser marcado como `PASSA` ou `FALHA`
- cada falha deve ter dono e prazo
- cada item deve ter evidencia objetiva (arquivo, rota, print, log de build)

## Cabecalho de auditoria

- Modulo:
- Responsavel:
- Data:
- Versao alvo:
- Status geral: `PASSA` ou `FALHA`

## 1. Estrutura de list

- [ ] `PASSA` usa `RecordListHost`
- [ ] `PASSA` possui acao `Novo` quando permitido
- [ ] `PASSA` usa `SearchPanel` padrao (sem barra paralela)
- [ ] `PASSA` `Filter` e `Group` operacionais
- [ ] `PASSA` typeviews no conjunto canonico quando aplicavel
- [ ] `PASSA` colunas base (`Tags`, `Cadastro`, `Status`) quando aplicavel

Evidencia:

- Arquivo(s):
- Rota(s):

## 2. Estrutura de detail

- [ ] `PASSA` usa `DetailShellEngine`
- [ ] `PASSA` `new` e `edit` usam o mesmo formulario principal
- [ ] `PASSA` nao usa `renderizador legado de formularios` legado no fluxo `new/edit/detail`
- [ ] `PASSA` detail nao exibe botao `Novo`
- [ ] `PASSA` acao `Excluir` apenas quando permitida
- [ ] `PASSA` `Tags` nao sao duplicadas no corpo principal
- [ ] `PASSA` relations nao duplicam card de contagem/resumo no corpo principal

Evidencia:

- Arquivo(s):
- Rota(s):

## 3. Side padrao

- [ ] `PASSA` usa `StandardDetailMetadataSide`
- [ ] `PASSA` nenhuma aba visivel fica sem operacao real
- [ ] `PASSA` `Comentarios`, `Notas internas`, `Tags` e `Anexos` so aparecem quando houver suporte funcional completo
- [ ] `PASSA` `Auditoria`, `Historico` e `Contexto` seguem comportamento canonico
- [ ] `PASSA` side nao usa texto explicativo de ajuda dentro da tela

Evidencia:

- Arquivo(s):
- Rota(s):

## 4. Relations canonicas

- [ ] `PASSA` relations no rodape do detail ou aba canonica
- [ ] `PASSA` relation usa host/list padrao
- [ ] `PASSA` relation operacional usa `ListView`, nunca `grade tabular legada`
- [ ] `PASSA` filtros, selecao e acoes de relation operacional ficam no proprio slot relacional
- [ ] `PASSA` clique abre detail relacionado
- [ ] `PASSA` criar relacao usa fluxo relacional canonico
- [ ] `PASSA` nao depende de tela legada
- [ ] `PASSA` relation nao usa texto explicativo ou card de resumo duplicado

Evidencia:

- Arquivo(s):
- Rota(s):

## 5. Matriz de cardinalidade

- [ ] `PASSA` cada relacao declara cardinalidade (`1:1`, `1:N`, `N:1`, `N:N`)
- [ ] `PASSA` `1:1` com FK unica (`@unique`) no lado dependente
- [ ] `PASSA` `1:N` e `N:1` com FK indexada
- [ ] `PASSA` `N:N` com entidade associativa explicita e `@@unique` composto
- [ ] `PASSA` sem N:N implicito quando ha estado de negocio

Evidencia:

- Arquivo(s):
- Modelos/relacoes:

## 6. Consistencia funcional

- [ ] `PASSA` labels visiveis em portugues
- [ ] `PASSA` sem erro de acentuacao ou texto corrompido
- [ ] `PASSA` sem texto tecnico para usuario final
- [ ] `PASSA` textos de orientacao migrados para `Como usar` quando necessario
- [ ] `PASSA` sem componente legado fora do shell canonico
- [ ] `PASSA` sem `grade tabular legada` no fluxo canonico ativo do modulo
- [ ] `PASSA` sem `renderizador legado de formularios` no fluxo canonico ativo do modulo
- [ ] `PASSA` sem modulo removido ou rota legada no fluxo canonico ativo

Evidencia:

- Arquivo(s):
- Observacoes:

## 7. Gates tecnicos

- [ ] `PASSA` smoke de contrato de modulo
- [ ] `PASSA` lint frontend
- [ ] `PASSA` build frontend
- [ ] `PASSA` lint backend do escopo impactado ou backlog transversal `pos_1_0` documentado
- [ ] `PASSA` build backend

Evidencia:

- Comandos:
- Resultado:

## Fechamento

- Pendencias abertas:
- Dono de cada pendencia:
- Prazo final:
- Decisao de liberacao 1.0: `APROVADO`, `APROVADO_COM_RISCO_DOCUMENTADO` ou `BLOQUEADO`

