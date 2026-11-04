# Estado atual

Atualizado em 2026-11-04. **Producao esta no commit `254cb6a`.** O `main` esta em
`53c1399`: o PR #3 foi **mesclado** em 2026-11-04 18:03 UTC, entao o codigo das notificacoes,
a memoria `ai/`, o `DEPLOY.md` corrigido e os scripts ja estao no `main`.

**As notificacoes ainda NAO estao em producao.** O `main` esta a frente da VPS. O deploy foi
tentado pela sessao local e **barrado pelo classificador de modo automatico**, que bloqueia
escrita em producao sem autorizacao explicita do Alef. O codigo esta pronto e testado; falta
so o Alef liberar o passo.

> Como `main` e producao divergiram, nao basta olhar o GitHub para saber o que esta no ar.
> A pergunta que decide: a tabela `community_notifications` existe no banco de producao?
> Existe -> o deploy aconteceu. Nao existe -> nao aconteceu.

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

### 2. Marcar membros com `@` — a base ja existe

As **notificacoes** foram feitas (comentario e reacao na sua publicacao), que era a parte
que faltava para a mencao valer alguma coisa. Falta a mencao em si.

O ponto em aberto e **como identificar a pessoa**: nome nao e unico em `affiliates`, e o
formulario e um `<textarea>` simples, sem autocomplete. Decidir isso antes de implementar.
Uma vez escolhido, a notificacao e so chamar `insert` com `kind: "mention"` em
`src/lib/notifications.ts`.

### 3. Backup automatico — INSTALADO em 2026-11-04

Rodando na VPS, instalado por `scripts/setup-backups.sh --aplicar`:

- **03h00** — banco, com `sqlite3 ".backup"`, retencao de 14 dias
- **03h30** — `data/uploads/` em tar.gz, mesma retencao

O proprio script provou o backup na hora de instalar: a copia abriu com 17 afiliados.
O crontab anterior ficou guardado em `/root/backups/crontab-antes-*.txt`.

Para tirar copia **fora** da VPS existe `scripts/puxar-backups.sh`, que roda na maquina
local, traz os arquivos para `find-skills/backups-producao/` e **confere que o .sqlite
abre**. Ja rodou uma vez com sucesso. Falta agendar no Agendador de Tarefas do Windows,
depois das 3h30 — enquanto isso, rodar a mao de vez em quando.

### 4. Disco da VPS em 91%

8,7 GB livres. Ver `known-issues.md` item 9.

### 5. Membro de teste em producao

`teste.comunidade@premiummember.local` (id 23), ativo e contando. Decidir se apaga antes de
divulgar.

### 6. Saques — conferido, nao ha nenhum

O `CONTINUACAO.md` falava em "saques envolvidos". Conferido em 2026-11-04 direto no banco
de producao: `SELECT status, COUNT(*) FROM withdrawals GROUP BY status` devolve **zero
linhas**. Nao ha dinheiro devido a ninguem. O trecho do `CONTINUACAO.md` estava velho.

### Sobre os 17 membros de producao

O Alef definiu em 2026-11-04 que sao de um projeto antigo, sem valor real, e podem ser
recadastrados. Nao trate como dado sagrado.

**Mas continue conferindo a contagem depois de todo restart.** Ela nao protege os registros:
detecta se o app subiu apontando para outro banco (`known-issues.md` item 1). Contagem
inesperada significa cadastros **futuros** indo para pasta que o proximo build apaga.

Sobre os saques, ver o item 6 acima: conferido, nao ha nenhum.

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
