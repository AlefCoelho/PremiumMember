# Deploy — passo a passo

Publicar as notificacoes da comunidade em producao, um comando por vez.

**Regra geral:** se o resultado nao for o que esta em "deve aparecer", **pare** e mande o que
apareceu. Ate o passo 14 nada em producao muda — da para desistir a qualquer momento.

**Quanto tempo:** uns 15 minutos, a maior parte esperando o build.

---

## O que vai acontecer

A VPS baixa o codigo novo **direto do GitHub** — seu computador nao entra no caminho, nao
precisa de clone local nem de `scp`. Nenhuma dependencia nova foi adicionada, entao nao ha
`npm ci`: so `npm run build`.

A unica mudanca no banco e **uma tabela nova** (`community_notifications`), criada sozinha
quando o app sobe. Nenhuma tabela existente e alterada. Por isso o rollback e so voltar o
codigo antigo.

---

## Parte 1 — Backup (nao pule)

### Passo 1

```
ssh premium-vps
```

**Deve aparecer:** uma linha terminando com `~#`.

### Passo 2 — Quantos membros existem agora

```
sqlite3 /home/user/htdocs/socios-premiums/data/socios-premiums.sqlite "SELECT COUNT(*) FROM affiliates;"
```

**Deve aparecer:** `17`, ou mais.

**Anote esse numero.** E ele que decide se o deploy deu certo, no passo 17.

### Passo 3 — Backup do banco

```
mkdir -p /root/backups && sqlite3 /home/user/htdocs/socios-premiums/data/socios-premiums.sqlite ".backup /root/backups/antes-deploy-$(date +%F-%H%M).sqlite"
```

**Deve aparecer:** nada.

### Passo 4 — Backup das imagens

```
tar czf /root/backups/uploads-antes-deploy-$(date +%F-%H%M).tar.gz -C /home/user/htdocs/socios-premiums/data uploads
```

**Deve aparecer:** nada. Se disser `Cannot stat`, tudo bem: ninguem enviou imagem ainda.

### Passo 5 — Guardar o codigo atual, que e o ponto de rollback

```
cd /home/user/htdocs/socios-premiums && tar czf /root/backups/src-antes-deploy-$(date +%F-%H%M).tar.gz src
```

**Deve aparecer:** nada.

### Passo 6 — Conferir que os tres existem

```
ls -lh /root/backups/*antes-deploy*
```

**Deve aparecer:** tres arquivos (ou dois, se o passo 4 avisou `Cannot stat`), cada um com
tamanho. **Se faltar o do banco ou o do src, pare.** Sem eles nao ha volta.

---

## Parte 2 — Espaco em disco

O disco esta em 91%. O build precisa de folga.

### Passo 7

```
df -h / | tail -1
```

Anote a coluna de uso.

### Passo 8 — Liberar o cache do npm

```
npm cache clean --force
```

**Deve aparecer:** um aviso em amarelo. E normal. Isso nao apaga nada do site.

### Passo 9

```
df -h / | tail -1
```

**Deve aparecer:** uso menor que no passo 7. Se ainda estiver acima de 95%, pare e me avise.

---

## Parte 3 — Baixar o codigo novo

### Passo 10

```
cd /root && curl -L -o premium-novo.tar.gz https://github.com/AlefCoelho/PremiumMember/archive/refs/heads/memoria-operacional.tar.gz
```

**Deve aparecer:** uma barra de progresso.

### Passo 11 — Descompactar

```
cd /root && rm -rf PremiumMember-memoria-operacional && tar xzf premium-novo.tar.gz
```

**Deve aparecer:** nada.

### Passo 12 — Conferir que o arquivo novo veio junto

```
ls -l /root/PremiumMember-memoria-operacional/src/lib/notifications.ts
```

**Deve aparecer:** o arquivo, com tamanho.

**Se disser "No such file":** o download veio errado. Pare e repita do passo 10.

---

## Parte 4 — Trocar o codigo

Daqui em diante producao muda. O passo 5 e a sua volta.

### Passo 13 — Conferir onde voce esta

```
cd /home/user/htdocs/socios-premiums && pwd
```

**Deve aparecer:** exatamente `/home/user/htdocs/socios-premiums`.

**Se aparecer outra coisa, pare.** O proximo passo apaga uma pasta.

### Passo 14 — Trocar o src

```
rm -rf src && cp -r /root/PremiumMember-memoria-operacional/src ./src
```

**Deve aparecer:** nada.

### Passo 15 — Conferir que chegou

```
ls src/lib/notifications.ts && ls src/app/socio/comunidade/notificacoes/
```

**Deve aparecer:** os dois caminhos, sem erro.

---

## Parte 5 — Buildar

### Passo 16

```
npm run build
```

**Deve aparecer:** a lista de rotas, demorando alguns minutos. Procure
`/socio/comunidade/notificacoes` na lista.

**Se o build falhar:** otimo lugar para falhar — o app antigo continua no ar, nada foi
publicado. Me mande o erro.

### Passo 17 — Copiar os estaticos para dentro do pacote

```
cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/ 2>/dev/null; echo ok
```

**Deve aparecer:** `ok`.

---

## Parte 6 — Reiniciar e conferir

### Passo 18

```
systemctl restart socios-premiums
```

**Deve aparecer:** nada.

### Passo 19 — O numero que decide tudo

```
sqlite3 /home/user/htdocs/socios-premiums/data/socios-premiums.sqlite "SELECT COUNT(*) FROM affiliates;"
```

**Deve aparecer:** o **mesmo numero do passo 2**.

**Se vier diferente — principalmente se vier 0 ou 1 — PARE e va para a Parte 7 agora.**
Significa que o app subiu apontando para outro banco.

### Passo 20 — As imagens continuam la

```
ls /home/user/htdocs/socios-premiums/data/uploads/ 2>/dev/null || echo "pasta ainda nao existe"
```

**Deve aparecer:** as pastas `avatars` e `posts`, ou o aviso de que ainda nao existe. O que
**nao** pode e estar vazia se antes tinha conteudo.

### Passo 21 — O site responde

```
curl -s -o /dev/null -w '%{http_code}\n' https://premiummember.online/socio/login
```

**Deve aparecer:** `200`.

### Passo 22 — A tabela nova nasceu

```
sqlite3 /home/user/htdocs/socios-premiums/data/socios-premiums.sqlite ".tables" | tr ' ' '\n' | grep notif
```

**Deve aparecer:** `community_notifications`.

Se nao aparecer, nao e erro ainda: a tabela nasce quando alguem abre a comunidade. Faca o
passo 23 e confira de novo.

### Passo 23 — Testar no navegador

Entre em https://premiummember.online/socio/login com um membro real:

1. Cai em `/socio/comunidade`.
2. No menu lateral aparece **Notificacoes**, entre Feed e Favoritos.
3. Clicar abre a pagina. Se ninguem comentou nada ainda, diz que nao ha nada por aqui.
4. `/socio/ganhos` continua mostrando indicacoes e saldo corretos.

Deu tudo certo? **Terminou.** Me avise que eu atualizo a memoria do projeto com o commit
que foi para producao, para a sessao local nao refazer o deploy.

---

## Parte 7 — Rollback

Use se o passo 19 deu numero diferente, ou se o site quebrou.

### Passo R1 — Ver o nome exato do backup do codigo

```
ls -t /root/backups/src-antes-deploy-*.tar.gz | head -1
```

Copie o nome que aparecer.

### Passo R2 — Voltar o codigo

```
cd /home/user/htdocs/socios-premiums && rm -rf src && tar xzf /root/backups/src-antes-deploy-AAAA-MM-DD-HHMM.tar.gz
```

Troque `AAAA-MM-DD-HHMM` pelo nome do passo R1.

### Passo R3 — Buildar e subir

```
npm run build && cp -r .next/static .next/standalone/.next/ && systemctl restart socios-premiums
```

### Passo R4 — Conferir

```
sqlite3 /home/user/htdocs/socios-premiums/data/socios-premiums.sqlite "SELECT COUNT(*) FROM affiliates;"
```

**Deve aparecer:** o numero do passo 2.

### Se o banco tiver sido danificado

```
systemctl stop socios-premiums
ls -t /root/backups/antes-deploy-*.sqlite | head -1
```

Depois, trocando o nome pelo que apareceu:

```
cp /root/backups/antes-deploy-AAAA-MM-DD-HHMM.sqlite /home/user/htdocs/socios-premiums/data/socios-premiums.sqlite
rm -f /home/user/htdocs/socios-premiums/data/socios-premiums.sqlite-wal /home/user/htdocs/socios-premiums/data/socios-premiums.sqlite-shm
systemctl start socios-premiums
```

Apagar o `-wal` e o `-shm` e obrigatorio: sao restos do banco antigo, e o SQLite tentaria
aplica-los no banco restaurado.
