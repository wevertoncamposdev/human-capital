# PadrÃ£o CanÃ´nico do Web Client

## Objetivo

Todo mÃ³dulo do sistema deve usar a mesma estrutura visual e comportamental. O usuÃ¡rio nÃ£o deve reaprender a interface ao mudar de mÃ³dulo.

## Estrutura obrigatÃ³ria

Cada mÃ³dulo canÃ´nico tem:

1. rota principal `/module`
2. detail em `/module/new` e `/module/[id]`
3. list principal com `RecordListHost`
4. detail com `DetailShellEngine`
5. side padrÃ£o com `StandardDetailMetadataSide`

## List Principal

O list principal Ã© sempre construÃ­do no mesmo padrÃ£o:

- botÃ£o principal `Novo`
- `SearchPanel` Ãºnico do sistema
- `Filter` e `Group` no menu do painel
- `typeviews` no mesmo conjunto padrÃ£o
- colunas base comuns do mÃ³dulo

### SearchPanel

O `SearchPanel` nÃ£o deve ganhar barras paralelas, filtros fora do menu ou controles exclusivos do mÃ³dulo.

O padrÃ£o canÃ´nico permite:

- busca textual
- favoritos
- `Filter`
- `Group`
- refresh
- contador

Se o mÃ³dulo precisar de filtros por `Projeto`, `Grupo`, `Status` ou qualquer outro campo, isso entra no prÃ³prio `SearchPanelMenu`.

### Typeviews padrÃ£o

Quando o mÃ³dulo suportar visualizaÃ§Ã£o analÃ­tica, usar somente a base compartilhada:

- `Tabela`
- `Kanban`
- `Timeline`
- `CalendÃ¡rio`
- `Gantt`
- `GrÃ¡fico`

NÃ£o criar typeview alternativo fora desses componentes.

### Colunas base

Todo list principal deve expor, quando fizer sentido:

- coluna principal do item
- `Tags`
- `Cadastro`
- `Status`

Outras colunas entram conforme o domÃ­nio, mas essas sÃ£o a base visual do sistema.

## Detail

O detail Ã© o centro de gestÃ£o do item.

### Regra de layout

O detail canÃ´nico Ã© dividido em 4 zonas:

1. `headSlot`
2. `detailSlot`
3. `sideSlot`
4. `relationSlot`

### headSlot

O `headSlot` contÃ©m:

- tÃ­tulo do item
- status
- aÃ§Ãµes de topo

Regras:

- o botÃ£o `Novo` nÃ£o aparece no detail
- a aÃ§Ã£o destrutiva principal Ã© `Excluir`, quando permitida
- `new` e `edit` usam o mesmo cabeÃ§alho e a mesma estrutura

### detailSlot

O `detailSlot` Ã© o formulÃ¡rio principal do item.

Regras:

- `new` e `edit` usam o mesmo formulÃ¡rio
- nÃ£o criar formulÃ¡rio antigo para `new` e outro para `edit`
- o formulÃ¡rio principal Ã© sempre editÃ¡vel
- o mÃ³dulo nÃ£o deve depender de `renderizador legado de formularios` legado
- os campos principais do item ficam aqui, nÃ£o no `sideSlot`

### sideSlot

O `sideSlot` Ã© Ãºnico e padronizado.

Abas canÃ´nicas:

- `Auditoria`
- `Comentarios`
- `Notas internas`
- `Tags`
- `Anexos`
- `Historico`
- `Contexto`

Regras:

- `Tags` ficam somente no `sideSlot`
- nÃ£o duplicar `Tags` no corpo principal
- `Historico` deve nascer da auditoria canÃ´nica sempre que possÃ­vel
- `Comentarios` usam menÃ§Ã£o por `@`
- `Anexos` usam o fluxo padrÃ£o de upload e exclusÃ£o

### relationSlot

O `relationSlot` representa relaÃ§Ãµes do item com outros registros.

Regras:

- relations ficam no rodapÃ© do detail
- cada relation deve se comportar como um list do sistema
- usar `ListView` e o host relacional compartilhado
- clicar em um item da relation deve abrir o detail do item relacionado
- `Novo` dentro da relation abre o fluxo de criaÃ§Ã£o relacional correto
- evitar cards operacionais isolados quando a relaÃ§Ã£o puder ser modelada como list

### Tipos de relation

Existem apenas 2 tipos canÃ´nicos de relation:

- `relation informacional`: lista relacional simples, com abertura do detail relacionado e aÃ§Ãµes de vincular/remover quando aplicÃ¡vel
- `relation operacional`: lista relacional que tambÃ©m executa operaÃ§Ã£o de negÃ³cio no prÃ³prio slot

### Relation operacional

Use `relation operacional` quando a mesma lista precisar suportar fluxo de trabalho dentro da aba ou do rodapÃ©, como:

- presenÃ§a
- nota
- destaque
- observaÃ§Ã£o
- seleÃ§Ã£o em lote
- aÃ§Ã£o por linha

Estrutura obrigatÃ³ria da `relation operacional`:

- barra superior compacta no prÃ³prio `relationSlot`
- busca no padrÃ£o do slot relacional
- filtros do domÃ­nio no topo da relation, sem criar tela paralela
- aÃ§Ãµes globais no topo (`Selecionar`, `Salvar`, `Vincular`, etc.) quando necessÃ¡rio
- mÃ©tricas compactas e textuais (`total`, `filtrados`, `alterados`, `selecionados`)
- corpo sempre em `ListView`
- aÃ§Ãµes por linha implementadas nas colunas da prÃ³pria lista
- seleÃ§Ã£o em lote usando a seleÃ§Ã£o nativa do `ListView`
- salvamento explÃ­cito quando houver mutaÃ§Ã£o em lote
- dialog auxiliar apenas para complemento operacional, nunca como estrutura principal da relation

Regras visuais da `relation operacional`:

- nÃ£o usar card de resumo duplicando a contagem jÃ¡ exibida na relation
- nÃ£o usar subtÃ­tulo ou texto explicativo no corpo da tela
- nÃ£o usar `grade tabular legada`
- nÃ£o criar page de gestÃ£o paralela quando o fluxo puder existir no shell atual

## Regras de implementaÃ§Ã£o

### ObrigatÃ³rio

- `RecordListHost` no list principal
- `DetailShellEngine` no detail
- `StandardDetailMetadataSide` no side
- `RelationListHost` ou relation equivalente do web-client no rodapÃ©

### Proibido

- criar page paralela fora do shell padrÃ£o
- criar `SearchPanel` customizado por mÃ³dulo
- criar layout diferente entre `new` e `edit`
- deixar `Tags` no body principal
- usar componentes legados quando jÃ¡ existir capability canÃ´nica
- usar `grade tabular legada` em `list`, `detail`, `relationSlot` ou abas relacionais do fluxo canÃ´nico ativo
- usar `renderizador legado de formularios` em `/module/new`, `/module/[id]` ou formulÃ¡rio principal de mÃ³dulo canÃ´nico
- manter modulo removido ou rota legada no fluxo ativo de modulos canonicos

## Legados a eliminar do fluxo ativo

Os seguintes legados nÃ£o fazem parte do padrÃ£o canÃ´nico `1.0`:

- `grade tabular legada`: substituir por `ListView`
- `renderizador legado de formularios`: substituir pelo formulÃ¡rio principal dentro de `DetailShellEngine`
- modulos removidos do canÃ´nico: excluir do fluxo ativo, sem compatibilidade permanente

## Checklist rÃ¡pido

Um mÃ³dulo sÃ³ Ã© canÃ´nico quando:

- `/module` usa o list padrÃ£o
- `/module/new` abre o detail padrÃ£o
- `/module/[id]` usa o mesmo detail padrÃ£o
- `sideSlot` tem a estrutura fixa
- `relationSlot` usa list relacional
- relation operacional usa `ListView`, nunca `grade tabular legada`
- `SearchPanel` funciona igual aos outros mÃ³dulos
- as mesmas views estÃ£o disponÃ­veis quando o domÃ­nio suporta

