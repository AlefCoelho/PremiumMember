# Frontend

Server components por padrao. Client component so quando ha estado de interacao real:
`StrategyFlowBuilder`, `CommunityPostCard`, `CommunitySidebar`, `AffiliateLinkButton`,
`ImageUploadField`.

## Padroes

- **Mutacao = `<form action={serverAction}>`**, sem `fetch` do cliente, sem `useState` para
  formulario. Campos escondidos levam os ids.
- **Erro de validacao devolve a pessoa para a propria pagina com aviso**, nunca lanca
  excecao — lancar da tela de erro de servidor (ver `known-issues.md` item 6).
- **Editor inline em `<details>`**: lista de cartoes, cada um com um `<details>` que abre o
  formulario. Evita modal, evita tabela larga, funciona sem JS.
  Referencia: `src/app/admin/comunidade/page.tsx`.
- **Nunca tabela com muitas colunas de acao** (`known-issues.md` item 8).
- **Reordenar** = botoes `up`/`down` que postam `direction`, nao drag-and-drop.
- **Excluir** pede confirmacao antes da action.
- Estilo em `src/app/globals.css`, classes proprias e variaveis CSS. **Nao ha Tailwind.**
- `lucide-react` para icones.

## Imagem: a reducao e no navegador

`ImageUploadField` redimensiona e converte para WebP **antes do upload**, baixando a
qualidade por etapas ate caber em 2 MB. Sem modulo nativo no servidor. No teste, 3149 KB
viraram 19 KB. Ao adicionar outro campo de imagem, reuse esse componente em vez de enviar
o arquivo cru.

## Paginas

### Membro — `/socio`, cookie `sp_affiliate_session`

| Rota | O que e |
|---|---|
| `/socio` | so redireciona para a comunidade |
| `/socio/comunidade` | feed, com "Eventos futuros" e "Publicacoes em alta" a direita |
| `/socio/comunidade/[space]` | espaco, publicacoes e formulario de publicar |
| `/socio/comunidade/[space]/[postId]` | publicacao e comentarios |
| `/socio/comunidade/favoritos` | o que o membro salvou |
| `/socio/comunidade/eventos` | proximos e gravados |
| `/socio/comunidade/perfil` | foto de perfil |
| `/socio/ganhos` | indicacoes, comissoes e saques (era o antigo `/socio`) |
| `/socio/login`, `/socio/recuperar-senha`, `/socio/redefinir-senha` | acesso |

### Admin — `/`, cookie `sp_session`

| Rota | O que e |
|---|---|
| `/` | membros, indicacoes, saques, regras, construtor de estrategia (40KB) |
| `/admin/comunidade` | grupos e espacos |
| `/admin/eventos` | agendar lives, ver quem confirmou |
| `/admin/senhas` | gerar link de redefinicao para um membro |

Os dois portais tem cookies separados e **convivem na mesma sessao de navegador**.
