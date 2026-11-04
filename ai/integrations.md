# Integracoes

## InfinitePay (unico gateway)

- `src/lib/infinitepay.ts` monta o checkout; `INFINITEPAY_HANDLE` identifica a conta.
- `POST /api/infinitepay/checkout` — chamada server-to-server, protegida por
  `PREMIUM_MEMBER_API_SECRET` (`src/lib/api-security.ts`).
- `POST /api/webhooks/infinitepay` — recebe confirmacao, valida
  `INFINITEPAY_WEBHOOK_SECRET`, grava em `payment_orders` e marca `referrals.paid_at`.
- `order_nsu` e **unico** em `payment_orders`: e a chave de idempotencia do webhook.
  Reentrega do mesmo evento nao pode duplicar comissao.
- `/pagamento/infinitepay/retorno` e a pagina de volta do cliente — informativa, nao
  confia nela para liberar nada. Quem libera e o webhook.

## Rastreio de afiliado

`/r/[code]` e `/r/[code]/[product]` gravam `affiliate_clicks` com `click_uid` e redirecionam
para a URL de cadastro do produto (`COPYSHIELD_SIGNUP_URL` / `TRADESHIELD_SIGNUP_URL`,
tambem em `program_settings`). O `click_uid` costura clique -> `payment_orders` -> comissao.

## Saques

Manuais. PIX (`affiliates.pix_key`) ou carteira digital (`digital_wallets`, com
tesourarias Polygon/TRON/BNB/Bitcoin semeadas). Nao ha payout automatico.

## Variaveis de ambiente

`JWT_SECRET`, `SOCIOS_DB_PATH`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
`AFFILIATE_PUBLIC_BASE_URL`, `COPYSHIELD_SIGNUP_URL`, `TRADESHIELD_SIGNUP_URL`,
`INFINITEPAY_HANDLE`, `PREMIUM_MEMBER_API_SECRET`, `INFINITEPAY_WEBHOOK_SECRET`.

Todas tem default de desenvolvimento no codigo — nenhum serve em producao.
