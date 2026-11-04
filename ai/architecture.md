# Arquitetura

Next.js 16 App Router + React 19 + TypeScript. SQLite local via `better-sqlite3`.
Build com `output: "standalone"` (ver `next.config.ts`) — isso importa no deploy.

## Camadas

```
src/app/*               paginas (server components) + server actions
src/lib/db.ts           schema + queries do nucleo (afiliados/comissoes)
src/lib/community.ts    schema + queries da comunidade (Circle.so-like)
src/lib/events.ts       eventos e confirmacao de presenca
src/lib/profiles.ts     foto de perfil do membro
src/lib/storage.ts      gravacao de imagem em disco (unico ponto de I/O de arquivo)
src/lib/password-reset.ts  token de redefinicao de senha do membro
src/lib/rules.ts        constantes e regras puras do programa
src/lib/auth.ts         sessoes JWT em cookie httpOnly
src/lib/infinitepay.ts + api-security.ts   integracao de pagamento (hoje desligada)
src/components/*        poucos client components
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
| `/admin/eventos` | admin | `requireAdmin()` |
| `/admin/senhas` | admin | `requireAdmin()` |
| `/login` | publico | — |
| `/socio` | membro | so redireciona para `/socio/comunidade` |
| `/socio/comunidade[/[space][/[postId]]]` | membro | `requireAffiliate()` |
| `/socio/comunidade/{eventos,favoritos,perfil}` | membro | `requireAffiliate()` |
| `/socio/ganhos` | membro | `requireAffiliate()` |
| `/socio/login` | publico | — |
| `/socio/recuperar-senha` e `/socio/redefinir-senha` | publico | token |
| `/uploads/[...file]` | logado | sessao de membro **ou** admin |
| `/cadastro-membro` | publico | — |
| `/r/[code]` e `/r/[code]/[product]` | publico | redirect + registro de clique |
| `/api/infinitepay/checkout` | servidor | `PREMIUM_MEMBER_API_SECRET` · 404 se desligada |
| `/api/webhooks/infinitepay` | InfinitePay | `INFINITEPAY_WEBHOOK_SECRET` · 404 se desligada |
| `/pagamento/infinitepay/retorno` | cliente | — |

**A casa do membro e `/socio/comunidade`**, nao `/socio`. O painel de indicacoes,
comissoes e saques vive em `/socio/ganhos`. O redirect em `/socio` existe para nao quebrar
link ja divulgado.

## Fluxo de venda

clique em `/r/[code]` -> `affiliate_clicks` (com `click_uid`) -> checkout InfinitePay
-> webhook marca `payment_orders.status` e `referrals.paid_at` -> carencia de 7 dias
-> comissao vira saldo disponivel -> saque manual via PIX.

**Hoje esse fluxo esta parado na etapa do checkout**: a InfinitePay esta desligada e um
pagamento externo e usado no lugar, entao `paid_at` entra manualmente pelo admin.
