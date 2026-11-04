# Frontend

Server components por padrao. Client component so quando ha estado de interacao real —
hoje sao 4: `StrategyFlowBuilder`, `CommunityPostCard`, `CommunitySidebar`,
`AffiliateLinkButton`.

## Padroes

- **Mutacao = `<form action={serverAction}>`**, sem `fetch` do cliente, sem `useState`
  para formulario. Campos escondidos (`<input type="hidden">`) levam os ids.
- **Editor inline em `<details>`**: lista de cartoes, cada um com um `<details>` que abre
  o formulario de edicao. Evita modal, evita tabela larga, funciona sem JS.
  Referencia: `src/app/admin/comunidade/page.tsx`.
- **Nunca tabela com muitas colunas de acao.** Em viewport estreita as acoes saem da tela
  (foi um bug real, ver `known-issues.md`). Use cartoes empilhados.
- **Reordenar** = dois botoes `up`/`down` que postam `direction` na action, nao drag-and-drop.
- **Excluir** pede confirmacao antes de disparar a action.
- Estilo em `src/app/globals.css` com classes proprias e variaveis CSS. Nao ha Tailwind.
- `lucide-react` para icones.

## Paginas principais

| Arquivo | O que e |
|---|---|
| `src/app/page.tsx` (40KB) | painel admin completo — o maior arquivo do projeto |
| `src/app/socio/page.tsx` (15KB) | portal do membro: KPIs, links, saques |
| `src/app/admin/comunidade/page.tsx` | admin de grupos e espacos |
| `src/app/socio/comunidade/*` | feed, espaco e post do membro |
