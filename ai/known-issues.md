# Problemas conhecidos e areas sensiveis

## 0. REGRA QUE NAO SE QUEBRA: o motor de comissao

Nenhuma alteracao toca `affiliates`, `referrals`, `withdrawals` ou `payment_orders`. E o
diferencial do produto. Toda tabela nova nasce separada, com `CREATE TABLE IF NOT EXISTS`,
justamente para o deploy nunca precisar de `ALTER TABLE`.

(O doc de continuacao cita tambem `commissions`; essa tabela **nao existe** no codigo hoje.
Se for criada algum dia, entra na mesma protecao.)

Depois de todo deploy, conferir `affiliates: 17` e `admins: 2` **apos** o restart. Mudou?
Rollback na hora.

## 0.1 `ADMIN_PASSWORD` so vale na primeira subida

A semente do admin em `db.ts` usa `INSERT OR IGNORE`: depois que a conta existe, trocar
`ADMIN_PASSWORD` no ambiente e reiniciar **nao muda a senha**. Parece que deveria, e nao muda.

Trocar: `/admin/senhas` -> "Minha senha de administrador" (pede a senha atual).
Recuperar sem acesso: `node scripts/resetar-senha-admin.js <email> <senha>` na VPS, guia em
`scripts/SENHA-ADMIN.md`. O deploy copia so `src/`, entao `scripts/` pode nao estar na VPS.

Nao "conserte" a semente para reler a variavel a cada subida: isso desfaria, a cada restart,
a senha que o admin escolheu pelo painel.

## 1. `SOCIOS_DB_PATH` + saida standalone (critico)

`next.config.ts` usa `output: "standalone"`. Sem `SOCIOS_DB_PATH` absoluto, `db.ts` cai em
`process.cwd()/data`, que nesse modo aponta para `.next/standalone/data` — pasta que o
proximo `next build` **apaga**. Ja aconteceu: havia um banco orfao de 30/06 com 1 afiliado
e 3 indicacoes (copia em `/root/backups/orfao-standalone-2026-11-03.sqlite`).

Hoje o unit do systemd define a variavel. Nunca a remova.

## 2. Uploads tem a mesma armadilha — e por isso nao vao para `public/`

Na saida standalone o `public/` e recriado a cada build: imagem que o membro enviasse
sumiria no deploy seguinte. As imagens ficam em `data/uploads/`, ao lado do banco
(`SOCIOS_UPLOADS_DIR`, ou derivado de `SOCIOS_DB_PATH`), e sao servidas pela rota
`/uploads/[...file]`, que exige sessao e so aceita o padrao de nome que nos geramos
(barra path traversal). **Nunca mova upload para `public/`.**

Backup do `.sqlite` sozinho **nao** protege as imagens. O `DEPLOY.md` passou a cobrir isso
em 2026-11-04 (tar no passo 2, restauracao no rollback, segunda linha de crontab).

## 3. Nao use `path.join` dinamico no escopo de modulo

O rastreio de arquivos do Turbopack conclui que o projeto inteiro e dependencia e incha a
saida standalone. Em `storage.ts` a resolucao do diretorio ficou dentro de uma funcao com
cache por causa disso.

## 4. Backup de SQLite em WAL

Copiar so o `.sqlite` perde transacoes do `-wal` — que costuma estar **maior** que o
arquivo principal. Use sempre `sqlite3 <db> ".backup '<destino>'"`, que funciona com o app
no ar. Nunca `cp` do `.sqlite`.

## 5. A pasta do projeto na VPS nao e um repositorio git

Deploy copia arquivos por `scp`. `git pull` na VPS nao funciona como o passo 3 do
`DEPLOY.md` sugere. Manter o GitHub atualizado e um passo **separado** do deploy.

## 6. Validacao de formulario nao pode lancar excecao

`containsExternalLink` devolve a pessoa para a propria pagina com aviso. Lancar excecao
dava tela de erro de servidor. Vale para toda validacao de entrada do membro.

## 7. Slug nao acompanha rename (intencional)

Renomear grupo ou espaco nao muda o slug, para nao quebrar URL divulgada. Se pedirem
"corrigir o slug", confirme antes: e uma quebra de link.

## 8. Tabela larga em viewport estreita (resolvido, nao repetir)

O admin da comunidade nasceu como tabela de 1334px num viewport de 723px — as acoes ficavam
fora da tela. Virou lista de cartoes com `<details>`. Nao volte a por muitas colunas de
acao numa tabela.

## 9. Uma sessao de nuvem nao alcanca a VPS

Nao ha cliente ssh no container e a porta 22 de `2.24.65.26` nao responde: a saida vai por
um proxy HTTPS, que nao roteia ssh. Nenhuma credencial resolve isso de dentro daqui. Tarefa
que precisa da VPS vira script no repositorio, para alguem rodar de uma maquina com acesso.

## 10. Disco da VPS em 91%

8,7 GB livres. O Premium Member ocupa ~700 MB; o grosso sao 58 GB em `/home/user` de outros
sites. Ha 2,1 GB de cache npm em `/root/.npm` que sai com `npm cache clean --force`.

## 11. `better-sqlite3` e modulo nativo

Precisa casar com o Node da VPS (v22.23.1). Se a versao mudar, apague `node_modules` antes
de `npm ci`. Enquanto nao houver dependencia nova, o deploy roda `npm run build` **sem**
`npm ci`.

## 12. Membro de teste vivo em producao

`teste.comunidade@premiummember.local` (id 23) esta ativo e **entra nas contagens**.
Decidir se apaga antes de divulgar.

## 13. `src/app/page.tsx` tem 40KB

Painel admin inteiro num arquivo. Zero teste automatizado em todo o projeto; verificacao e
manual, pelo passo 7 do `DEPLOY.md`.
