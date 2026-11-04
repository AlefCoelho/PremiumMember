# Deploy na VPS

Runbook para publicar uma versao nova do Premium Member sem perder dados de membros,
indicacoes e saques. O banco e um arquivo SQLite e as imagens que os membros enviam sao
arquivos ao lado dele, entao backup dos dois vem antes de tudo.

## Ambiente real (verificado em 2026-11-03; linha de uploads conferida no codigo em 254cb6a)

| Item | Valor |
|---|---|
| Host | `root@2.24.65.26` (srv1638461, Ubuntu, kernel 6.8) |
| Atalho SSH local | `premium-vps` |
| Projeto | `/home/user/htdocs/socios-premiums` |
| Servico | `socios-premiums.service` (systemd, **Caminho C**) |
| Porta | 3020, atras do nginx (`/etc/nginx/sites-available/socios-premiums.conf`) |
| Banco | `/home/user/htdocs/socios-premiums/data/socios-premiums.sqlite` |
| Uploads | `/home/user/htdocs/socios-premiums/data/uploads/` (fotos de perfil e imagens de publicacao) |
| `SOCIOS_DB_PATH` | definido no unit, caminho absoluto — a armadilha do passo 1 **nao** se aplica |
| `SOCIOS_UPLOADS_DIR` | se nao estiver no unit, `storage.ts` deriva de `SOCIOS_DB_PATH` — confira no passo 1 |
| Node | v22.23.1 · `sqlite3` disponivel em `/usr/bin/sqlite3` |
| Env | `/home/user/htdocs/socios-premiums/.env.local` |

Tres pontos a saber:

1. **A pasta do projeto nao e um repositorio git.** O deploy copia arquivos: o passo 3 usa
   `scp`/`rsync` de `src/` e builda na VPS. Manter o GitHub atualizado e um passo separado.
2. **Existe um banco orfao** em `.next/standalone/data/socios-premiums.sqlite`, de 30/06,
   com 1 afiliado e 3 indicacoes. E residuo de quando `SOCIOS_DB_PATH` ainda nao estava
   definido — a armadilha aconteceu uma vez. O proximo `npm run build` apaga esse arquivo.
   Ha copia em `/root/backups/orfao-standalone-2026-11-03.sqlite`.
3. **As imagens dos membros nao estao em `public/`, e nao podem estar.** Na saida
   standalone o `public/` e recriado a cada build, entao o que o membro enviasse sumiria no
   deploy seguinte. Elas ficam em `data/uploads/`, servidas pela rota `/uploads/[...file]`,
   que exige sessao. Isso significa que **backup do `.sqlite` sozinho nao protege a
   comunidade**: perde foto de perfil e imagem de publicacao.

## Antes de comecar: descobrir como o app roda hoje

Rode na VPS e guarde a saida. Sem isso nao da para escolher o comando de restart.

```bash
pm2 list; docker ps; systemctl list-units --type=service | grep -iE 'premium|next|node'; ls -la ~
```

- Saiu algo em `pm2 list` -> siga o **Caminho A**.
- Saiu um container em `docker ps` -> siga o **Caminho B**.
- Saiu um service no `systemctl` -> siga o **Caminho C**.
- Nao saiu nada -> o app pode estar rodando em `screen`, `tmux` ou `nohup`. Rode
  `ps aux | grep -E 'node|next'` e me mande o resultado antes de seguir.

## Passo 1: achar o banco e a pasta de uploads

```bash
echo "$SOCIOS_DB_PATH"
echo "$SOCIOS_UPLOADS_DIR"
find / -name 'socios-premiums.sqlite*' -not -path '*/node_modules/*' 2>/dev/null
find / -type d -name uploads -not -path '*/node_modules/*' -not -path '*/.next/*' 2>/dev/null
```

Anote os dois caminhos completos. Vao ser usados no backup e no passo 5.

Se `SOCIOS_UPLOADS_DIR` estiver vazio, `src/lib/storage.ts` deriva a pasta de
`SOCIOS_DB_PATH` (o diretorio do banco, mais `/uploads`). Funciona, mas prefira a variavel
explicita no unit: assim mover o banco um dia nao arrasta as imagens junto sem aviso.

> **Se o `find` achar uploads dentro de `.next`, pare.** Significa que o app rodou sem
> `SOCIOS_DB_PATH` em algum momento e as imagens estao na pasta que o build apaga. Mova
> para fora antes de buildar, como no aviso abaixo.

> **Atencao ao `output: "standalone"`.** O `next.config.ts` usa saida standalone, e o
> servidor roda a partir de `.next/standalone`. Quando `SOCIOS_DB_PATH` nao esta definido,
> `src/lib/db.ts` cai no padrao `process.cwd()/data`, que nesse modo aponta para dentro de
> `.next/standalone/data` — uma pasta que o proximo `next build` apaga. Se o `find` acima
> achar o banco dentro de `.next`, **nao faca deploy ainda**: mova o arquivo para fora
> (por exemplo `/var/lib/premium-member/`) e aponte `SOCIOS_DB_PATH` para la, com caminho
> absoluto, antes de qualquer build.

## Passo 2: backup do banco e das imagens

O banco roda em modo WAL, entao copiar so o arquivo `.sqlite` pode deixar para tras
transacoes que ainda estao no `-wal`. Use o `.backup` do proprio SQLite, que resolve isso
com o app no ar:

```bash
mkdir -p ~/backups
sqlite3 /caminho/do/socios-premiums.sqlite ".backup '$HOME/backups/socios-$(date +%F-%H%M).sqlite'"
```

Sem o `sqlite3` instalado, pare o app primeiro e copie os tres arquivos:

```bash
cp socios-premiums.sqlite socios-premiums.sqlite-wal socios-premiums.sqlite-shm ~/backups/
```

Agora as imagens. Elas nao estao no banco, entao o `.backup` acima nao as alcanca:

```bash
tar czf ~/backups/uploads-$(date +%F-%H%M).tar.gz -C /caminho/do/data uploads
```

Depois **tire as duas copias da VPS**, para o backup nao morrer junto com o servidor:

```bash
# rode isto na sua maquina, nao na VPS
scp premium-vps:~/backups/socios-*.sqlite ./
scp premium-vps:~/backups/uploads-*.tar.gz ./
```

Confira que o banco abriu e tem dados, e que o tar nao saiu vazio:

```bash
sqlite3 ~/backups/socios-*.sqlite "SELECT COUNT(*) FROM affiliates; SELECT COUNT(*) FROM referrals;"
tar tzf ~/backups/uploads-*.tar.gz | head
```

## Passo 3: atualizar o codigo

**A pasta de producao nao e um repositorio git**, entao nao existe `git pull` aqui. O deploy
copia arquivos. Primeiro guarde o `src/` atual como ponto de rollback, na VPS:

```bash
cd /home/user/htdocs/socios-premiums
tar czf ~/backups/src-$(date +%F-%H%M).tar.gz src
```

Depois, da sua maquina, com o repositorio no commit que vai subir:

```bash
git log --oneline -1          # anote este hash: e o que vai para producao
scp -r src/. premium-vps:/home/user/htdocs/socios-premiums/src/
```

`scp -r src/.` copia o conteudo de `src/` para dentro de `src/` da VPS. O ponto importa: sem
ele a copia aninha `src/src/`.

> Arquivo que voce **apagou** no repositorio nao desaparece da VPS com `scp`. Se o commit
> removeu ou renomeou algo em `src/`, use `rsync --delete` em vez do `scp`:
> `rsync -az --delete src/ premium-vps:/home/user/htdocs/socios-premiums/src/`

Atualizar o GitHub e um passo **separado** do deploy, nao substitui nenhum dos dois.

## Passo 4: instalar e buildar

`better-sqlite3` e um modulo nativo e precisa casar com a versao de Node da VPS.

```bash
node -v                       # esperado: v22.23.1
npm run build
```

**`npm ci` so quando o commit mexeu em `package.json`.** Rodar sem necessidade recompila o
modulo nativo e gasta disco, que esta apertado (ver o fim deste documento). Se a versao de
Node mudou desde a ultima instalacao, ai sim: apague `node_modules` e rode `npm ci`.

O build precisa terminar listando as rotas do app atual — entre elas `/socio/comunidade`,
`/socio/ganhos`, `/socio/comunidade/eventos`, `/admin/comunidade`, `/admin/eventos`,
`/admin/senhas` e `/uploads/[...file]`. Se ele falhar, pare aqui: nada foi publicado ainda e
o app antigo continua no ar.

Na saida standalone, copie os estaticos para dentro do pacote:

```bash
cp -r public .next/standalone/ 2>/dev/null || true
cp -r .next/static .next/standalone/.next/
```

## Passo 5: conferir as variaveis de ambiente

O `.env.production` (ou o bloco de env do pm2/docker) precisa ter, no minimo:

Obrigatorias:

```
JWT_SECRET=<segredo real, nunca o de exemplo>
SOCIOS_DB_PATH=/caminho/absoluto/do/socios-premiums.sqlite
SOCIOS_UPLOADS_DIR=/caminho/absoluto/do/data/uploads
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
AFFILIATE_PUBLIC_BASE_URL=https://premiummember.online
COPYSHIELD_SIGNUP_URL=...
TRADESHIELD_SIGNUP_URL=...
```

Opcionais — **cada uma liga um recurso, e a falta dela desliga limpo**, sem erro:

```
INFINITEPAY_HANDLE=...            # as tres juntas ligam o pagamento;
PREMIUM_MEMBER_API_SECRET=...     # faltando uma, checkout e webhook respondem 404
INFINITEPAY_WEBHOOK_SECRET=...
RESEND_API_KEY=...                # as duas juntas ligam o e-mail de redefinicao de senha;
MAIL_FROM=...                     # sem elas, o admin gera o link em /admin/senhas
```

`SOCIOS_DB_PATH` absoluto e obrigatorio, pelo motivo explicado no passo 1, e
`SOCIOS_UPLOADS_DIR` pelo mesmo motivo. Trocar `JWT_SECRET` desloga todo mundo, entao so
troque se for intencional.

**Hoje a InfinitePay esta desligada de proposito**, por decisao do Alef, que usa um
pagamento externo provisorio. Se voce nao for religa-la, nao preencha as tres: as rotas
respondendo 404 e o estado correto, nao um defeito.

## Passo 6: reiniciar

**Caminho A — pm2**

```bash
pm2 restart premium-member --update-env
pm2 logs premium-member --lines 50
```

**Caminho B — docker**

```bash
docker compose build && docker compose up -d
docker compose logs -f --tail 50
```

**Caminho C — systemd** (e este o caminho desta VPS)

O servico se chama `socios-premiums`, **nao** `premium-member`:

```bash
sudo systemctl restart socios-premiums
sudo journalctl -u socios-premiums -n 50 -f
```

## Passo 7: verificar

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://premiummember.online/socio/login
```

**O numero que decide o rollback vem primeiro.** Confira no banco, depois do restart:

```bash
sqlite3 /caminho/do/socios-premiums.sqlite \
  "SELECT COUNT(*) FROM affiliates;" \
  "SELECT COUNT(*) FROM referrals;" \
  "SELECT COUNT(*) FROM withdrawals;"
```

Esperado hoje: **17 afiliados e 2 admins**. Mudou para baixo? Rollback na hora, antes de
qualquer outra verificacao — e o sinal de que o app subiu apontando para outro banco.

Confirme tambem que as tabelas continuam todas la:

```bash
sqlite3 /caminho/do/socios-premiums.sqlite ".tables"
```

E que as imagens sobreviveram ao build:

```bash
ls /caminho/do/data/uploads/avatars | wc -l
ls /caminho/do/data/uploads/posts | wc -l
```

Pasta vazia depois de um deploy em que existiam imagens antes significa que o build as
apagou — restaure o tar do passo 2 e conserte `SOCIOS_UPLOADS_DIR` antes de seguir.

Depois, no navegador, com um membro real:

1. Login em `/socio/login` — cai em `/socio/comunidade`, que e a casa do membro.
2. O feed abre, com **Eventos futuros** e **Publicacoes em alta** a direita.
3. Publicar e comentar em **Apresente-se aqui**.
4. Uma publicacao com imagem carrega a foto (prova que a rota `/uploads` serve).
5. `/socio/comunidade/perfil` mostra a foto de perfil ja existente.
6. `/socio/ganhos` — indicacoes, comissoes e saldo continuam certos.
7. `/socio/comunidade/eventos` lista os eventos agendados.

E no admin:

8. `/admin/comunidade` lista os grupos e espacos.
9. `/admin/eventos` abre e mostra quem confirmou presenca.
10. `/admin/senhas` gera um link de redefinicao.

Se a InfinitePay estiver desligada, `curl` nas duas rotas de pagamento deve dar **404** —
esse e o estado certo, nao um defeito:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://premiummember.online/api/webhooks/infinitepay
```

## Rollback

As tabelas novas so sao criadas, nenhuma tabela antiga e alterada, entao voltar o codigo
e suficiente — os dados da comunidade ficam parados no banco, sem atrapalhar.

Como a pasta nao e um repositorio git, o rollback do codigo e o tar do passo 3:

```bash
cd /home/user/htdocs/socios-premiums
rm -rf src
tar xzf ~/backups/src-AAAA-MM-DD-HHMM.tar.gz
npm run build
cp -r .next/static .next/standalone/.next/
systemctl restart socios-premiums
```

Se o banco tiver sido corrompido, pare o app, restaure o backup por cima e suba de novo.
Os tres arquivos: apagar o `-wal` e o `-shm` orfaos e obrigatorio, senao o SQLite tenta
aplicar um WAL que nao pertence a esse banco:

```bash
systemctl stop socios-premiums
cp ~/backups/socios-AAAA-MM-DD-HHMM.sqlite /caminho/do/socios-premiums.sqlite
rm -f /caminho/do/socios-premiums.sqlite-wal /caminho/do/socios-premiums.sqlite-shm
systemctl start socios-premiums
```

Se as imagens sumiram, restaure o tar de uploads:

```bash
systemctl stop socios-premiums
rm -rf /caminho/do/data/uploads
tar xzf ~/backups/uploads-AAAA-MM-DD-HHMM.tar.gz -C /caminho/do/data
systemctl start socios-premiums
```

## Backup recorrente

Backup so antes de deploy nao protege contra perda no dia a dia. Agende um diario:

```bash
crontab -e
```

```
0 3 * * * sqlite3 /caminho/do/socios-premiums.sqlite ".backup '/root/backups/socios-$(date +\%F).sqlite'" && find /root/backups -name 'socios-*.sqlite' -mtime +14 -delete
30 3 * * * tar czf /root/backups/uploads-$(date +\%F).tar.gz -C /caminho/do/data uploads && find /root/backups -name 'uploads-*.tar.gz' -mtime +14 -delete
```

No crontab o `%` precisa da barra: `\%F`. Sem ela a linha e cortada ali e o backup sai com
nome errado, todos os dias no mesmo arquivo.

**Atencao ao disco**: ele esta em 91%, com 8,7 GB livres. Dois backups diarios com 14 dias
de retencao cabem com folga no tamanho atual, mas confira `df -h` depois da primeira
semana. Ha 2,1 GB recuperaveis em `/root/.npm` com `npm cache clean --force`.

Guarde uma copia fora da VPS. Backup que mora so no servidor nao e backup.
