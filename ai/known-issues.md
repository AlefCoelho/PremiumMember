# Problemas conhecidos e areas sensiveis

## 1. `SOCIOS_DB_PATH` + saida standalone (critico)

`next.config.ts` usa `output: "standalone"`. Sem `SOCIOS_DB_PATH` absoluto, `db.ts` cai em
`process.cwd()/data`, que nesse modo aponta para `.next/standalone/data` — pasta que o
proximo `next build` **apaga**. Isso ja aconteceu uma vez: havia um banco orfao de 30/06
com 1 afiliado e 3 indicacoes (copia em `/root/backups/orfao-standalone-2026-11-03.sqlite`).

Hoje na VPS o unit do systemd define `SOCIOS_DB_PATH` absoluto, entao a armadilha esta
fechada. Nunca remova essa variavel.

## 2. Backup de SQLite em WAL

Copiar so o `.sqlite` perde transacoes que estao no `-wal`. Use sempre
`sqlite3 <db> ".backup '<destino>'"`, que funciona com o app no ar. Alternativa: parar o
app e copiar os tres arquivos (`.sqlite`, `-wal`, `-shm`).

## 3. A pasta do projeto na VPS nao e um repositorio git

Deploy foi feito copiando arquivos. `git pull` na VPS nao funciona como o `DEPLOY.md`
sugere no passo 3 — e preciso `rsync`/`scp` de `src/` e buildar la, ou inicializar git.

## 4. Tabela larga em viewport estreita (resolvido, nao repetir)

O admin da comunidade nasceu como tabela de 1334px num viewport de 723px — as acoes
ficavam fora da tela. Foi trocado por lista de cartoes com `<details>`. Nao volte a
colocar muitas colunas de acao numa tabela.

## 5. Slug nao acompanha rename (intencional)

Renomear grupo ou espaco **nao** muda o slug, para nao quebrar URL ja divulgada. O slug
sai do nome na criacao e recebe sufixo numerico se colidir. Se alguem pedir "corrigir o
slug", confirme antes: e uma quebra de link.

## 6. `better-sqlite3` e modulo nativo

Precisa casar com a versao de Node da VPS (hoje v22.23.1). Se a versao de Node mudar,
apague `node_modules` antes de `npm ci`.

## 7. `src/app/page.tsx` tem 40KB

Painel admin inteiro num arquivo. Alterar exige cuidado; nao ha teste automatizado em
nenhuma parte do projeto.
