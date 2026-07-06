# Premium Member

Sistema de membros e afiliados para cadastro, pagamento, indicacoes e acompanhamento de comissoes do ecossistema Premium Member.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- SQLite com `better-sqlite3`
- Autenticacao com `bcryptjs` e `jsonwebtoken`
- InfinitePay para checkout/webhook

## Setup local

```bash
npm install
cp .env.example .env.local
npm run dev
```

Depois ajuste as variaveis em `.env.local`, principalmente:

- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `AFFILIATE_PUBLIC_BASE_URL`
- `COPYSHIELD_SIGNUP_URL`
- `TRADESHIELD_SIGNUP_URL`
- `INFINITEPAY_HANDLE`
- `PREMIUM_MEMBER_API_SECRET`
- `INFINITEPAY_WEBHOOK_SECRET`

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Dados locais

O banco SQLite fica em `data/` e nao deve ser versionado. Use `.env.example` como referencia para configurar ambientes novos.

## Materiais

A pasta `outputs/` contem evidencias visuais e apresentacoes usadas no desenvolvimento e na validacao do produto.
