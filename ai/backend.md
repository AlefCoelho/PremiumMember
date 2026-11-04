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
`community_groups`, `community_spaces`, `community_posts`, `community_comments`.
Grupos e espacos tem `position` (ordem) e `status` (`active`/`archived`).
Espaco tem `kind` (`posts`/`support`/`lessons`) e `min_eligible_sales` (gate de acesso).

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

## Autenticacao

Duas sessoes independentes, ambas JWT assinado com `JWT_SECRET` em cookie httpOnly:

| | cookie | validade | guarda |
|---|---|---|---|
| admin | `sp_session` | 7d | `requireAdmin()` -> `/login` |
| membro | `sp_affiliate_session` | 14d | `requireAffiliate()` -> `/socio/login` |

Senhas com `bcryptjs` (10 rounds). Membro sem `password_hash` ou com `status != 'active'`
nao loga. Trocar `JWT_SECRET` desloga todo mundo.
