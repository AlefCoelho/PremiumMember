# Backup diario — passo a passo

Guia para instalar o backup automatico na VPS, um comando por vez. Nao precisa entender os
comandos. Precisa conferir o que aparece depois de cada um.

**Regra geral:** se o resultado nao for o que esta em "deve aparecer", **pare** e mande o que
apareceu. Nada aqui apaga dado — mas parar na duvida e de graca.

---

## Leia antes: uma coisa que vai parecer erro

No passo 6 voce digita `+%F`. No passo 11, `+\%F`, com barra.

**Nao e erro de digitacao.** Digitado na mao, o `%` e normal. Dentro do crontab, o `%` tem
significado especial e precisa da barra para virar texto. Sem a barra, o backup automatico
gravaria todo dia no mesmo arquivo, e voce teria um dia de historico em vez de quatorze.

Digite exatamente como esta em cada passo.

---

## Parte 1 — Entrar na VPS

### Passo 1

No terminal do seu computador:

```
ssh premium-vps
```

Se der erro, tente:

```
ssh root@2.24.65.26
```

**Deve aparecer:** uma linha terminando com `~#`, tipo `root@srv1638461:~#`. Dali em diante,
tudo que voce digitar roda na VPS.

### Passo 2 — Confirmar que o banco esta onde esperamos

```
ls -lh /home/user/htdocs/socios-premiums/data/socios-premiums.sqlite
```

**Deve aparecer:** uma linha com o arquivo e um tamanho em MB.

**Se aparecer "No such file or directory":** pare. O banco mudou de lugar e o resto do guia
nao serve.

### Passo 3 — Confirmar a ferramenta de backup

```
which sqlite3
```

**Deve aparecer:** `/usr/bin/sqlite3`

**Se nao aparecer nada:** pare e me avise. Sem ela o backup seguro nao funciona.

### Passo 4 — Ver quantos membros existem hoje

```
sqlite3 /home/user/htdocs/socios-premiums/data/socios-premiums.sqlite "SELECT COUNT(*) FROM affiliates;"
```

**Deve aparecer:** `17`, ou mais se entraram membros novos.

Anote esse numero. Vai ser usado no passo 7.

---

## Parte 2 — Fazer um backup a mao, para provar que funciona

Antes de automatizar, fazemos uma vez na mao. Se der errado aqui, deu errado na sua frente,
e nao as 3h da manha sem ninguem ver.

### Passo 5 — Criar a pasta dos backups

```
mkdir -p /root/backups
```

**Deve aparecer:** nada. Em terminal, silencio e sinal de que deu certo.

### Passo 6 — Copiar o banco

```
sqlite3 /home/user/htdocs/socios-premiums/data/socios-premiums.sqlite ".backup /root/backups/socios-$(date +%F).sqlite"
```

**Deve aparecer:** nada.

### Passo 7 — Conferir que a copia tem os dados

```
sqlite3 /root/backups/socios-$(date +%F).sqlite "SELECT COUNT(*) FROM affiliates;"
```

**Deve aparecer:** o mesmo numero do passo 4.

Numero diferente ou erro? **Pare.** A copia nao presta, e nao vale automatizar um comando
que nao funciona.

### Passo 8 — Copiar as imagens dos membros

As fotos de perfil e as imagens das publicacoes nao estao dentro do banco. Sao arquivos
separados, e o passo 6 nao as alcanca.

```
tar czf /root/backups/uploads-$(date +%F).tar.gz -C /home/user/htdocs/socios-premiums/data uploads
```

**Deve aparecer:** nada.

**Se aparecer "uploads: Cannot stat: No such file or directory":** esta tudo bem. Significa
que nenhum membro enviou imagem ainda. Siga para o passo 9; o automatico vai pegar quando
comecarem a enviar.

### Passo 9 — Ver o que foi criado

```
ls -lh /root/backups/
```

**Deve aparecer:** `socios-<data>.sqlite` e, se o passo 8 funcionou, `uploads-<data>.tar.gz`,
cada um com seu tamanho.

Ate aqui voce ja tem um backup de hoje. O resto e para ele se repetir sozinho.

---

## Parte 3 — Automatizar

### Passo 10 — Guardar a agenda atual antes de mexer

```
crontab -l > /root/backups/crontab-antes.txt 2>/dev/null; cat /root/backups/crontab-antes.txt
```

**Deve aparecer:** as tarefas que ja existem, ou nada se nao houver nenhuma. Os dois servem.
O importante e que agora existe uma copia, caso precise voltar (passo 16).

### Passo 11 — Agendar o backup do banco, 3h da manha

Atencao ao `\%F` com barra. Copie a linha inteira:

```
(crontab -l 2>/dev/null; echo '0 3 * * * sqlite3 /home/user/htdocs/socios-premiums/data/socios-premiums.sqlite ".backup /root/backups/socios-$(date +\%F).sqlite"') | crontab -
```

**Deve aparecer:** nada.

### Passo 12 — Agendar o backup das imagens, 3h30

```
(crontab -l 2>/dev/null; echo '30 3 * * * tar czf /root/backups/uploads-$(date +\%F).tar.gz -C /home/user/htdocs/socios-premiums/data uploads') | crontab -
```

**Deve aparecer:** nada.

### Passo 13 — Agendar a limpeza do que passou de 14 dias, 3h45

Sem isso a pasta cresce para sempre e enche o disco, que ja esta apertado.

```
(crontab -l 2>/dev/null; echo '45 3 * * * find /root/backups -name "socios-*.sqlite" -mtime +14 -delete; find /root/backups -name "uploads-*.tar.gz" -mtime +14 -delete') | crontab -
```

**Deve aparecer:** nada.

### Passo 14 — Conferir a agenda

```
crontab -l
```

**Deve aparecer:** as tres linhas que voce adicionou, comecando por `0 3`, `30 3` e `45 3`.
As duas primeiras devem ter `\%F`, **com** a barra.

Linha repetida (voce rodou o mesmo passo duas vezes) nao faz mal: o backup roda duas vezes e
grava no mesmo arquivo. Para limpar, use o passo 16 e repita a parte 3.

Pronto. O backup roda sozinho todas as noites.

---

## Parte 4 — O passo que as pessoas esquecem

### Passo 15 — Tirar uma copia de fora da VPS

Backup que mora so no servidor nao e backup: se o servidor morrer, morre com ele.

**Saia da VPS primeiro:**

```
exit
```

**Deve aparecer:** voce volta ao terminal do seu computador.

Agora, no seu computador:

```
scp premium-vps:/root/backups/socios-*.sqlite ~/Desktop/
```

**Deve aparecer:** uma barra de progresso, e o arquivo no seu Desktop.

Vale repetir de vez em quando. Uma vez por semana ja ajuda muito.

---

## Se precisar desfazer

### Passo 16 — Voltar a agenda como estava

```
crontab /root/backups/crontab-antes.txt
```

Confira depois com `crontab -l`. Os backups ja criados continuam la; so o agendamento volta
ao que era.

---

## Limpeza de disco (opcional, recomendado)

O disco da VPS esta em 91%. Ha espaco recuperavel em cache, que nao e dado de ninguem.

### Passo 17 — Ver o espaco antes

```
df -h / | tail -1
```

Anote a coluna de uso.

### Passo 18 — Ver quanto o cache do npm ocupa

```
du -sh /root/.npm
```

**Deve aparecer:** algo em torno de `2.1G`.

### Passo 19 — Limpar

```
npm cache clean --force
```

**Deve aparecer:** um aviso em amarelo. E normal: o `--force` sempre avisa.

Isso nao apaga nada do site. Cache de npm e download guardado, que volta sozinho na proxima
instalacao.

### Passo 20 — Ver o espaco depois

```
df -h / | tail -1
```

Compare com o passo 17.
