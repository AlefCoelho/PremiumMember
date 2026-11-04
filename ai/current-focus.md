# Estado atual

Atualizado em 2026-11-04. **Producao esta no commit `254cb6a`**, igual ao `main`.

## O que e

Plataforma unica do Alef Coelho: comunidade, aulas, suporte e central de afiliados no mesmo
lugar. Comecou como painel de afiliados.

## No ar

https://premiummember.online — VPS `root@2.24.65.26` (atalho SSH `premium-vps`), projeto em
`/home/user/htdocs/socios-premiums`, servico `socios-premiums.service`, porta 3020 atras do
nginx, Node v22.23.1. Banco em `data/socios-premiums.sqlite`, com `SOCIOS_DB_PATH` absoluto
no unit do systemd.

Producao: 17 afiliados, 2 admins. Conferir esses dois numeros **depois** de todo restart.

Dev local: `SOCIOS_DB_PATH` para um arquivo descartavel, `npx next dev -p 3021`.
Admin de dev: `admin@premiummember.local` / `admin123` (do `.env.example`; producao e outra).

## Duas mudancas de rumo recentes

**A comunidade virou a casa do membro.** `/socio` so redireciona para `/socio/comunidade`.
Indicacoes, comissoes e saques foram para `/socio/ganhos`.

**A InfinitePay esta desligada**, por decisao do Alef, que usa um sistema externo
provisorio. Checkout e webhook respondem 404 sem as chaves. Nenhuma comissao entra
automaticamente; `paid_at` e lancado pelo admin.

## O que falta

### 1. Niveis e badges do membro — pedido, nao comecado

Simbolo de nivel abaixo do nome, por tempo de comunidade + likes e favoritos recebidos, com
aviso de parabens ao subir. O Alef disse "podemos pensar melhor com calma": quantos niveis,
nomes e peso de cada criterio **nao foram decididos**. **Pergunte antes de implementar.**

Os dados ja existem: `community_reactions`, `community_favorites` e `affiliates.created_at`.

### 2. Marcar membros com `@` — nao implementado

Vale pouco sozinho: sem notificacao, ninguem sabe que foi marcado. Considere fazer junto com
notificacoes.

### 3. Backup automatico — recomendado, nao feito

So existem os backups manuais que precedem cada deploy, em `/root/backups/` e em
`find-skills/backups-producao/`. Com 16 membros reais e saques envolvidos, vale um cron
diario. O comando esta no `DEPLOY.md`. Falta tambem copia **fora** da VPS.

### 4. Disco da VPS em 91%

8,7 GB livres. Ver `known-issues.md` item 9.

### 5. Membro de teste em producao

`teste.comunidade@premiummember.local` (id 23), ativo e contando. Decidir se apaga antes de
divulgar.

## Antes de divulgar para alunos novos

- Cadastro publico **funciona**: `/cadastro-membro` cria conta, loga e abre a dashboard.
- Recuperacao de senha **funciona, sem e-mail automatico** enquanto `RESEND_API_KEY` nao for
  configurada. O admin gera o link em `/admin/senhas` e entrega.
- Pagamento **nao funciona**: InfinitePay desligada, sistema externo provisorio no lugar.

## Deploy, resumido

Runbook completo em `DEPLOY.md`, atualizado em 2026-11-04 para bater com a realidade
(uploads, procedimento real por `scp`, nome certo do servico). O que funciona hoje:

1. backup WAL-safe do banco (`sqlite3 ... ".backup ..."`, nunca `cp`) **e tar dos uploads**
2. copiar as duas copias para fora da VPS
3. `tar czf` do `src/` atual, como rollback
4. `scp -r src/. premium-vps:/home/user/htdocs/socios-premiums/src/` (`rsync --delete` se o
   commit apagou arquivo)
5. `npm run build` na VPS — `npm ci` **so** se mexeu em `package.json`
6. `cp -r .next/static .next/standalone/.next/` e `cp -r public .next/standalone/`
7. `systemctl restart socios-premiums` (nao `premium-member`)
8. conferir `affiliates: 17` e `admins: 2` **depois** do restart; mudou, rollback na hora
9. conferir que `data/uploads/` nao esvaziou

A pasta de producao nao e repositorio git. Atualizar o GitHub e passo **separado**: depois
do deploy, `main`, `feat/comunidade` e `feat/admin-comunidade` sao avancadas por
fast-forward para o mesmo commit.
