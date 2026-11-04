# Arquitetura

Next.js 16 App Router + React 19 + TypeScript. SQLite local via `better-sqlite3`.
Build com `output: "standalone"` (ver `next.config.ts`) — isso importa no deploy.

## Camadas

```
src/app/*            paginas (server components) + server actions
src/lib/db.ts        schema + queries do nucleo (afiliados/comissoes)
src/lib/community.ts schema + queries do modulo comunidade (Circle.so-like)
src/lib/rules.ts     constantes e regras puras do programa
src/lib/auth.ts      sessoes JWT em cookie httpOnly
src/lib/infinitepay.ts + api-security.ts   integracao de pagamento
src/components/*     poucos client components
```

Nao existe ORM nem camada de migracao. `db.ts` e `community.ts` rodam `CREATE TABLE IF NOT EXISTS`
no import, e `db.ts` tem `ensureColumn(table, column, def)` para adicionar colunas novas sem
migracao. Toda tabela nova deve seguir esse padrao: criar com `IF NOT EXISTS`, nunca alterar
tabela antiga.

## Rotas

| Rota | Quem acessa | Guarda |
|---|---|---|
| `/` | admin | `requireAdmin()` |
| `/admin/comunidade` | admin | `requireAdmin()` |
| `/login` | publico | — |
| `/socio` | membro | `requireAffiliate()` |
| `/socio/comunidade[/[space][/[postId]]]` | membro | `requireAffiliate()` |
| `/socio/login` | publico | — |
| `/cadastro-membro` | publico | — |
| `/r/[code]` e `/r/[code]/[product]` | publico | redirect + registro de clique |
| `/api/infinitepay/checkout` | servidor | `PREMIUM_MEMBER_API_SECRET` |
| `/api/webhooks/infinitepay` | InfinitePay | `INFINITEPAY_WEBHOOK_SECRET` |
| `/pagamento/infinitepay/retorno` | cliente | — |

## Fluxo de venda

clique em `/r/[code]` -> `affiliate_clicks` (com `click_uid`) -> checkout InfinitePay
-> webhook marca `payment_orders.status` e `referrals.paid_at` -> carencia de 7 dias
-> comissao vira saldo disponivel -> saque manual via PIX.
