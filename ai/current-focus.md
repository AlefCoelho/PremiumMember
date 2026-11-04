# Estado atual

Atualizado em 2026-11-04. HEAD `91b2749`, branch `main`, arvore limpa.

## No ar

https://premiummember.online — VPS `root@2.24.65.26`, systemd `socios-premiums.service`,
porta 3020 atras do nginx. Detalhes e runbook em `DEPLOY.md` (raiz do projeto).

Producao verificada apos o ultimo deploy: 17 afiliados, 2 admins, nenhuma alteracao de
schema, motor de comissao intacto. Backup WAL-safe em
`/root/backups/socios-2026-11-04-1004.sqlite`.

## Ultimo trabalho entregue

Admin da comunidade (`/admin/comunidade`) — Alef cria e organiza grupos e espacos sem
editar codigo nem rodar SQL:
- grupos: criar, renomear, reordenar, arquivar
- espacos: criar, renomear, descricao, mover de grupo, reordenar, arquivar, `kind`
  (`posts`/`support`/`lessons`), `min_eligible_sales`, excluir com confirmacao

Junto disso: tema escuro unico em todo o sistema, e os efeitos dourado/halo no login do
membro (ver `ui-system.md`).

## Areas sensiveis

- `SOCIOS_DB_PATH` — ver `known-issues.md` item 1. Risco de perda de banco.
- `src/app/page.tsx` (40KB) — painel admin inteiro num arquivo.
- Webhook InfinitePay — idempotencia por `order_nsu`; mexer ali afeta dinheiro.
- Zero teste automatizado no projeto. Verificacao e manual, pelo roteiro do passo 7 do
  `DEPLOY.md`.

## Pendencias conhecidas

- Deploy na VPS e manual por copia de arquivos (a pasta la nao e repositorio git).
- Backup diario por cron: receitado no `DEPLOY.md`, nao confirmado como instalado.
