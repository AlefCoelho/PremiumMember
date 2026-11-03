# Deploy na VPS

Runbook para publicar uma versao nova do Premium Member sem perder dados de membros,
indicacoes e saques. O banco e um arquivo SQLite, entao backup vem antes de tudo.

## Ambiente real (verificado em 2026-11-03)

| Item | Valor |
|---|---|
| Host | `root@2.24.65.26` (srv1638461, Ubuntu, kernel 6.8) |
| Atalho SSH local | `premium-vps` |
| Projeto | `/home/user/htdocs/socios-premiums` |
| Servico | `socios-premiums.service` (systemd, **Caminho C**) |
| Porta | 3020, atras do nginx (`/etc/nginx/sites-available/socios-premiums.conf`) |
| Banco | `/home/user/htdocs/socios-premiums/data/socios-premiums.sqlite` |
| `SOCIOS_DB_PATH` | definido no unit, caminho absoluto — a armadilha do passo 1 **nao** se aplica |
| Node | v22.23.1 · `sqlite3` disponivel em `/usr/bin/sqlite3` |
| Env | `/home/user/htdocs/socios-premiums/.env.local` |

Dois pontos descobertos na vistoria:

1. **A pasta do projeto nao e um repositorio git.** O deploy foi feito copiando arquivos,
   entao o passo 3 (`git pull`) nao funciona como esta escrito. Ou se inicializa o git na
   VPS, ou se copia `src/` por `scp`/`rsync` e se builda la.
2. **Existe um banco orfao** em `.next/standalone/data/socios-premiums.sqlite`, de 30/06,
   com 1 afiliado e 3 indicacoes. E residuo de quando `SOCIOS_DB_PATH` ainda nao estava
   definido — a armadilha aconteceu uma vez. O proximo `npm run build` apaga esse arquivo.
   Ha copia em `/root/backups/orfao-standalone-2026-11-03.sqlite`.

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

## Passo 1: achar o banco de producao

```bash
echo "$SOCIOS_DB_PATH"
find / -name 'socios-premiums.sqlite*' -not -path '*/node_modules/*' 2>/dev/null
```

Anote o caminho completo. Vai ser usado no backup e no passo 5.

> **Atencao ao `output: "standalone"`.** O `next.config.ts` usa saida standalone, e o
> servidor roda a partir de `.next/standalone`. Quando `SOCIOS_DB_PATH` nao esta definido,
> `src/lib/db.ts` cai no padrao `process.cwd()/data`, que nesse modo aponta para dentro de
> `.next/standalone/data` — uma pasta que o proximo `next build` apaga. Se o `find` acima
> achar o banco dentro de `.next`, **nao faca deploy ainda**: mova o arquivo para fora
> (por exemplo `/var/lib/premium-member/`) e aponte `SOCIOS_DB_PATH` para la, com caminho
> absoluto, antes de qualquer build.

## Passo 2: backup do banco

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

Depois **tire a copia da VPS**, para o backup nao morrer junto com o servidor:

```bash
# rode isto na sua maquina, nao na VPS
scp usuario@servidor:~/backups/socios-*.sqlite ./
```

Confira que o arquivo abriu e tem dados:

```bash
sqlite3 ~/backups/socios-*.sqlite "SELECT COUNT(*) FROM affiliates; SELECT COUNT(*) FROM referrals;"
```

## Passo 3: atualizar o codigo

```bash
cd /caminho/do/projeto
git fetch origin
git log --oneline -1          # anote este hash: e o seu ponto de rollback
git checkout main
git pull origin main
```

## Passo 4: instalar e buildar

`better-sqlite3` e um modulo nativo e precisa casar com a versao de Node da VPS. Se a
versao mudou desde a ultima instalacao, apague `node_modules` antes.

```bash
node -v
npm ci
npm run build
```

O build precisa terminar com as rotas `/socio/comunidade` na lista. Se ele falhar, pare
aqui: nada foi publicado ainda e o app antigo continua no ar.

Na saida standalone, copie os estaticos para dentro do pacote:

```bash
cp -r public .next/standalone/ 2>/dev/null || true
cp -r .next/static .next/standalone/.next/
```

## Passo 5: conferir as variaveis de ambiente

O `.env.production` (ou o bloco de env do pm2/docker) precisa ter, no minimo:

```
JWT_SECRET=<segredo real, nunca o de exemplo>
SOCIOS_DB_PATH=/caminho/absoluto/do/socios-premiums.sqlite
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
AFFILIATE_PUBLIC_BASE_URL=https://premiummember.online
COPYSHIELD_SIGNUP_URL=...
TRADESHIELD_SIGNUP_URL=...
INFINITEPAY_HANDLE=...
PREMIUM_MEMBER_API_SECRET=...
INFINITEPAY_WEBHOOK_SECRET=...
```

`SOCIOS_DB_PATH` absoluto e obrigatorio, pelo motivo explicado no passo 1. Trocar
`JWT_SECRET` desloga todo mundo, entao so troque se for intencional.

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

**Caminho C — systemd**

```bash
sudo systemctl restart premium-member
sudo journalctl -u premium-member -n 50 -f
```

## Passo 7: verificar

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://premiummember.online/socio/login
```

Depois, no navegador, com um membro real:

1. Login em `/socio` — os KPIs de indicacoes e saldo continuam certos.
2. Botao **Comunidade** aparece no topo.
3. `/socio/comunidade` abre com os grupos na lateral.
4. Publicar e comentar em **Apresente-se aqui**.
5. Voltar ao painel e conferir que indicacoes e saques nao mudaram.

Confirme no banco que as tabelas novas existem e as antigas estao intactas:

```bash
sqlite3 /caminho/do/socios-premiums.sqlite \
  ".tables" \
  "SELECT COUNT(*) FROM affiliates;" \
  "SELECT COUNT(*) FROM referrals;"
```

## Rollback

As tabelas novas so sao criadas, nenhuma tabela antiga e alterada, entao voltar o codigo
e suficiente — os dados da comunidade ficam parados no banco, sem atrapalhar.

```bash
cd /caminho/do/projeto
git checkout <hash anotado no passo 3>
npm ci && npm run build
pm2 restart premium-member --update-env    # ou o comando do seu caminho
```

Se o banco tiver sido corrompido, pare o app, restaure o backup por cima e suba de novo:

```bash
pm2 stop premium-member
cp ~/backups/socios-AAAA-MM-DD-HHMM.sqlite /caminho/do/socios-premiums.sqlite
rm -f /caminho/do/socios-premiums.sqlite-wal /caminho/do/socios-premiums.sqlite-shm
pm2 start premium-member
```

## Backup recorrente

Backup so antes de deploy nao protege contra perda no dia a dia. Agende um diario:

```bash
crontab -e
```

```
0 3 * * * sqlite3 /caminho/do/socios-premiums.sqlite ".backup '/root/backups/socios-$(date +\%F).sqlite'" && find /root/backups -name 'socios-*.sqlite' -mtime +14 -delete
```

Guarde uma copia fora da VPS. Backup que mora so no servidor nao e backup.
