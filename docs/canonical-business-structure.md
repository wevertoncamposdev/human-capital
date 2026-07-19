# Estrutura de Negócio Canônica

## PeopleGroup

`PeopleGroup` é o agrupamento institucional de pessoas.

Finalidades:

- `PUBLICO`
- `EQUIPE`

## Project

O projeto define:

- quais `Grupos de Pessoas` atende
- quais `Grupos de Equipe` participam do projeto
- quais participantes estão matriculados
- quais `Grupos de Participantes` existem dentro do projeto

## ProjectGroup

`ProjectGroup` é o agrupamento interno do projeto.

Ele organiza participantes já vinculados ao projeto.

Nome visível:

- `Grupo de Participantes`

## Action

A ação pertence a um projeto e pode ter alvo explícito:

- `PROJECT`
- `PEOPLE_GROUP`
- `PROJECT_GROUP`
- `ENROLLMENT`

### Participantes da ação

Representam as pessoas atendidas ou envolvidas como público da ação.

Na relation `Participantes`, a mesma lista deve suportar:

- presença
- nota
- destaque
- observação

### Equipe da ação

A equipe da ação não nasce na própria ação.

Ela vem da equipe institucional vinculada ao projeto. Na ação escolhemos quais membros da equipe participaram naquele evento.

### Fotos

Fotos são relation canônica, com list e inclusão de novos registros.

### Relatório

Relatório é a síntese da ação. Pode ser aba de leitura ou artefato relacionado, desde que permaneça dentro do shell canônico.

### Ocorrências

Ocorrências não fazem parte da modelagem ativa de `Action`.

## Ordem de canonização

Ao refatorar fluxo institucional:

1. `PeopleGroup`
2. `Project`
3. `ProjectGroup`
4. `Action`
