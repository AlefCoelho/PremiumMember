# Integracoes

## Estado: o pagamento esta desligado

**A InfinitePay esta desligada por decisao do Alef**, que usa um sistema externo
provisorio. `isInfinitePayEnabled()` exige `INFINITEPAY_HANDLE`,
`PREMIUM_MEMBER_API_SECRET` e `INFINITEPAY_WEBHOOK_SECRET`; sem as tres, checkout e webhook
respondem **404** em vez de ficarem expostos devolvendo 401/500. Configurando as chaves,
voltam sozinhas — nao ha codigo a mudar.

Consequencia: nenhuma comissao entra automaticamente. `paid_at` e lancado pelo admin.

## InfinitePay (quando ligada)

- `src/lib/infinitepay.ts` monta o checkout.
- `POST /api/infinitepay/checkout` — server-to-server, protegida por
  `PREMIUM_MEMBER_API_SECRET` (`src/lib/api-security.ts`).
- `POST /api/webhooks/infinitepay` — valida `INFINITEPAY_WEBHOOK_SECRET`, grava em
  `payment_orders`, marca `referrals.paid_at`.
- `order_nsu` e **unico**: e a chave de idempotencia. Reentrega do mesmo evento nao pode
  duplicar comissao.
- `/pagamento/infinitepay/retorno` e informativa. **Quem libera e o webhook**, nunca ela.

## E-mail (Resend) — opcional

So existe com `RESEND_API_KEY` **e** `MAIL_FROM`. `isMailConfigured()` decide; sem elas o
sistema **nao finge que mandou** — o admin gera o link em `/admin/senhas` e entrega pelo
canal que ja usa com o membro. Chamada HTTP direta a `api.resend.com`, sem dependencia nova.

## Google Meet — manual

O admin cola o link da sala em `/admin/eventos`; **o sistema nao cria a sala**. O botao de
entrar aparece de 10 minutos antes do inicio ate o fim da live, com 15 minutos de folga.

## Rastreio de afiliado

`/r/[code]` e `/r/[code]/[product]` gravam `affiliate_clicks` com `click_uid` e redirecionam
para a URL de cadastro do produto (`COPYSHIELD_SIGNUP_URL` / `TRADESHIELD_SIGNUP_URL`,
tambem em `program_settings`). O `click_uid` costura clique -> `payment_orders` -> comissao.

## Saques

Manuais. PIX (`affiliates.pix_key`) ou carteira digital (`digital_wallets`, com tesourarias
Polygon/TRON/BNB/Bitcoin semeadas). Nao ha payout automatico.

## Armazenamento de imagem

Disco local, em `data/uploads/`. Tudo passa por `src/lib/storage.ts` — migrar para
Cloudflare R2 ou Supabase e mexer **so nesse arquivo**. 1 GB aguenta dezenas de milhares de
imagens no tamanho atual, entao nao ha pressa.

## Variaveis de ambiente

Obrigatorias: `JWT_SECRET`, `SOCIOS_DB_PATH` (absoluto), `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
`AFFILIATE_PUBLIC_BASE_URL`, `COPYSHIELD_SIGNUP_URL`, `TRADESHIELD_SIGNUP_URL`.

Opcionais, que ligam recurso: `SOCIOS_UPLOADS_DIR`, `INFINITEPAY_HANDLE`,
`PREMIUM_MEMBER_API_SECRET`, `INFINITEPAY_WEBHOOK_SECRET`, `RESEND_API_KEY`, `MAIL_FROM`.

Todas tem default de desenvolvimento no codigo — nenhum serve em producao.
