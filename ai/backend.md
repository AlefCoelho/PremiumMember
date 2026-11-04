# Backend

## Banco

Um arquivo SQLite. Caminho vem de `SOCIOS_DB_PATH`; sem ela cai em `process.cwd()/data`
— perigoso em standalone (ver `known-issues.md`). `journal_mode = WAL` e `foreign_keys = ON`.

Tabelas do nucleo (`src/lib/db.ts`):
`admins`, `affiliates` (tem `sponsor_id` auto-referencial, `code` unico, `status`),
`referrals`, `withdrawals`, `program_settings` (linha unica, `id = 1`),
`payment_integrations`, `payment_orders`, `digital_wallets`, `strategy_flows`,
`affiliate_clicks`.

Tabelas da comunidade (`src/lib/community.ts`):
`community_groups`, `community_spaces`, `community_posts`, `community_comments`,
`community_reactions` (`post_id` + `affiliate_id` + `kind`), `community_favorites`,
`community_post_images` (1:1 com post), `community_featured_posts` ("em alta").
Grupos e espacos tem `position` (ordem) e `status` (`active`/`archived`).
Espaco tem `kind` (`posts`/`support`/`lessons`) e `min_eligible_sales` (gate de acesso).

Eventos (`src/lib/events.ts`): `community_events` (`starts_at`, `duration_minutes`,
`meet_url`, `recording_url`, `status` `scheduled`/`cancelled`) e `community_event_rsvps`
(`UNIQUE (event_id, affiliate_id)` — a confirmacao e um toggle idempotente).

Perfil (`src/lib/profiles.ts`): `affiliate_profiles`, chave primaria = `affiliate_id`.

Senha (`src/lib/password-reset.ts`): `affiliate_password_resets` com `token_hash` unico,
`expires_at` e `used_at`.

Notificacoes (`src/lib/notifications.ts`): `community_notifications`, com
`UNIQUE (affiliate_id, kind, post_id, comment_id, actor_type, actor_id)`. `comment_id` usa
**0 em vez de NULL** quando nao se aplica: no SQLite dois NULLs nao colidem numa UNIQUE,
entao com NULL cada clique de reacao criaria linha nova.

## Padroes obrigatorios

- **Schema**: `CREATE TABLE IF NOT EXISTS` no import do modulo. Coluna nova em tabela
  existente -> `ensureColumn()`. Nunca `ALTER`/`DROP` direto de tabela antiga.
- **Semente**: `INSERT OR IGNORE` com `id` fixo, para ser idempotente.
- **Server actions**: `"use server"` no topo, `requireAdmin()`/`requireAffiliate()` como
  primeira linha, parse e validacao do `FormData` por helpers locais
  (`requireText`, `requireId`, `requireDirection`, ...), `revalidatePath(PATH)` ao fim.
  Modelo de referencia: `src/app/admin/comunidade/actions.ts`.
- **Validacao sempre no servidor**, nunca so no formulario. Texto cortado por `maxLength`,
  numeros com piso/teto (`Math.min(Math.floor(v), 9999)`).
- **Erro** = `throw new Error("mensagem em portugues")`.
- **Dinheiro** sempre em centavos (`*_cents`), formatado por `src/lib/money.ts`.
- **Datas** em texto ISO (`YYYY-MM-DD` por `isoDate()`), nunca `Date` no banco.
- **Arquivo em disco so por `src/lib/storage.ts`.** Nenhum outro modulo escreve arquivo.
  Trocar de destino (R2, Supabase) e mexer so nele.
- **Recurso externo opcional checa o ambiente e desliga limpo**, em vez de falhar: ver
  `isInfinitePayEnabled()` (404) e `isMailConfigured()` (nao finge que mandou e-mail).

## Autenticacao

Duas sessoes independentes, ambas JWT assinado com `JWT_SECRET` em cookie httpOnly:

| | cookie | validade | guarda |
|---|---|---|---|
| admin | `sp_session` | 7d | `requireAdmin()` -> `/login` |
| membro | `sp_affiliate_session` | 14d | `requireAffiliate()` -> `/socio/login` |

Senhas com `bcryptjs` (10 rounds). Membro sem `password_hash` ou com `status != 'active'`
nao loga. Trocar `JWT_SECRET` desloga todo mundo.

## Redefinicao de senha do membro

Token aleatorio, guardado so como `token_hash`, valido 60 minutos e de uso unico. Pedido
novo invalida os anteriores. Envio por e-mail e **opcional** (`RESEND_API_KEY` + `MAIL_FROM`);
sem essas variaveis o admin gera o link em `/admin/senhas` e entrega pelo canal que ja usa.
`cleanupExpiredTokens()` limpa o que passou de 7 dias.

## Upload de imagem

`saveImage(file, "avatars" | "posts")` — teto de 2MB, so `webp`/`jpeg`/`png`, nome de
arquivo aleatorio e nunca reaproveitado. Servido por `/uploads/[...file]`, que exige sessao
de membro ou admin: sao fotos de pessoas e conteudo de area fechada, nao abrem para a
internet. Cache `private, immutable` por um ano, seguro porque o nome nao se repete.
