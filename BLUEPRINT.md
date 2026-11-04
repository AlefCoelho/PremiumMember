# Blueprint — estado do projeto e o que falta

Escrito em 2026-11-04 por uma sessao do Claude Code na nuvem, ao fim do seu trabalho.
Destinado a sessao local do Claude Code e ao Alef.

---

## 1. Onde cada coisa esta

> **Atualizado em 2026-11-04.** Entre a primeira versao deste documento e agora, o PR #3 foi
> mesclado, o backup diario entrou na VPS, o disco foi limpo e **o deploy aconteceu**. As
> secoes abaixo refletem o estado novo; o que mudou esta marcado.

| | Commit | O que e |
|---|---|---|
| **Producao (VPS)** | `53c1399` | no ar em https://premiummember.online, **com as notificacoes** |
| **`main` no GitHub** | `b83d84f` | 2 commits a frente — **so documentacao**, nenhum codigo |

**As notificacoes estao em producao** desde 2026-11-04. Conferido depois do restart: 17
afiliados, 2 admins, `community_notifications` criada, `data/uploads/` intacto com `avatars/`
e `posts/`, e as classes `notification-row` e `notification-avatar` na folha de estilo
servida. Nenhum erro no journal.

**O PR #3 foi fechado como merged pelo proprio GitHub**, nao por alguem clicando no botao: ao avancar o `main` por fast-forward ate os commits da branch, o GitHub reconheceu que tudo ja estava na base. Draft nao impede esse fechamento automatico.

**Daqui em diante `main` e producao podem divergir.** Nao basta olhar o GitHub para saber o
que esta no ar; hoje a diferenca e so documentacao, mas isso nao e garantido. Para saber se
um deploy aconteceu, pergunte ao banco de producao, nao ao repositorio.

---

## 2. O que foi concluido

### 2.1 Notificacoes da comunidade — codigo, precisa de deploy

O `CONTINUACAO.md` lista a mencao com `@` como pendente e observa que ela vale pouco sozinha:
sem notificacao, ninguem fica sabendo que foi marcado. A notificacao era a base que faltava.
Ela tambem resolve um problema proprio: hoje quem comenta numa publicacao so e descoberto se
o autor voltar nela por acaso.

- O autor e avisado quando alguem **comenta** ou **reage** na publicacao dele
- Contador no menu lateral, pagina `/socio/comunidade/notificacoes`, botao de marcar lidas
- Tabela nova e separada: `community_notifications`, `CREATE TABLE IF NOT EXISTS` no import,
  sem migracao. **Nenhuma tabela existente foi alterada.**

Tres decisoes, explicadas tambem em comentario no codigo:

1. `comment_id` guarda **0, nao NULL**, quando nao se aplica. No SQLite dois NULLs nao colidem
   numa `UNIQUE`, entao com NULL cada clique de reacao criaria linha nova.
2. **Retirar a reacao apaga a notificacao**, em vez de deixa-la apontando para algo que nao
   existe mais.
3. **Marcar como lidas e por botao**, nao por abrir a pagina: escrita durante a renderizacao
   de um server component roda mais de uma vez.

**Arquivos que vao para a VPS (7):**

```
src/lib/notifications.ts                        (novo)
src/app/socio/comunidade/notificacoes/page.tsx  (novo)
src/app/socio/comunidade/actions.ts
src/app/socio/comunidade/layout.tsx
src/components/CommunitySidebar.tsx
src/lib/community.ts
src/app/globals.css
```

`src/lib/community.ts` mudou so para `createComment` devolver o id do comentario.

### 2.2 `DEPLOY.md` corrigido — nao precisa de deploy

O runbook **nao mencionava os uploads em ponto nenhum**. Quem o seguisse fazia backup so do
`.sqlite`; as fotos de perfil e imagens de publicacao, que vivem em `data/uploads/`, ficavam
de fora — e o rollback tambem. Alem disso, tres erros que travariam um deploy no meio:

| Onde | Estava | Esta |
|---|---|---|
| Passo 3 | `git pull origin main` | `scp -r src/.` — a pasta de producao nao e repositorio git |
| Passo 6 | `systemctl restart premium-member` | `systemctl restart socios-premiums` |
| Passo 7 | conferir KPIs em `/socio` | `/socio` hoje so redireciona |

### 2.3 Memoria operacional `ai/` — nao precisa de deploy

Dez arquivos, indexados por `ai/README.md`. Esta sessao comecou num container vazio e
reconstruiu todo o contexto do zero; a memoria existe para isso nao se repetir.

O item 0 de `ai/known-issues.md` e a regra que nao se quebra: nunca tocar `affiliates`,
`referrals`, `withdrawals`, `payment_orders`.

### 2.4 Scripts e guias — nao precisam de deploy

| Arquivo | Para que |
|---|---|
| `scripts/DEPLOY-RAPIDO.md` | deploy em 6 comandos, sem backup de dados |
| `scripts/DEPLOY-PASSO-A-PASSO.md` | deploy completo, 23 passos, com backup |
| `scripts/BACKUP-PASSO-A-PASSO.md` | backup diario, 20 passos |
| `scripts/setup-backups.sh` | mesmo backup, automatizado |
| `scripts/PROMPT-SESSAO-LOCAL.md` | a instrucao para a sessao local |

As duas rotas de deploy baixam o codigo **direto do GitHub pela VPS**, por `curl`. Nenhuma
maquina local entra no caminho, nao ha `scp`. **Nenhuma dependencia nova foi adicionada**,
entao nao ha `npm ci` — so `npm run build`.

---

## 3. Como cada coisa foi verificada

Importante separar o que foi provado do que nao foi.

| Item | Verificacao | Status |
|---|---|---|
| Notificacoes | navegador real, banco descartavel, 2 membros criados pelo cadastro publico | **comprovado** |
| → comentario gera aviso | contador foi a 1, texto correto | ok |
| → reacao gera aviso | emoji e rotulo corretos | ok |
| → trocar de reacao | **mesma linha atualizada**, nao duplicada | ok |
| → retirar reacao | **aviso removido** | ok |
| → marcar lidas | contador zerou | ok |
| → nao notificar a si mesmo | sem aviso para quem agiu | ok |
| Build e lint | `npm run build` e `npm run lint` limpos, 25 rotas | **comprovado** |
| Celular (390px) | sem rolagem horizontal | **comprovado** |
| `setup-backups.sh` | sintaxe, escape do `\%F`, deduplicacao, `tar`, extracao do env do systemd | **parcial** |
| `DEPLOY.md` | conferido contra o codigo em `254cb6a` | **so leitura** |
| Guias de deploy | tarball da branch baixado e conferido (contem os arquivos novos) | **parcial** |
| Qualquer coisa na VPS | — | **nunca executado** |

**Nada disto rodou na VPS.** Esta sessao nunca a alcancou.

---

## 4. O que nao foi feito, e por que

### 4.1 O deploy

Nenhum passo do deploy acontece fora da VPS. Esta sessao nao a alcanca:

- nao ha cliente ssh no container (`which ssh` nao retorna nada)
- a porta 22 de `2.24.65.26` nao responde (conexao TCP expira)
- a saida vai por um proxy HTTPS, que so faz tunel para hosts permitidos; o README do proxy
  proibe contornar negacoes de politica

Remote Control foi tentado: o computador **ALEF** aparece conectado, mas nenhuma das pastas
e oferecida a sessoes de nuvem. Esse recurso pode ainda nao estar liberado para a conta.

**Resolvido em 2026-11-04:** a sessao local fez o deploy, com autorizacao do Alef. A primeira
tentativa dela tambem foi barrada, pelo classificador de modo automatico, que exige
autorizacao explicita para escrever em producao.

### 4.2 Backup diario e limpeza de disco

Mesmo motivo — **ambos resolvidos pela sessao local em 2026-11-04**. Ver passo 4 da secao 5.

### 4.3 Marcar o PR como pronto

Tentado e bloqueado pela politica desta sessao. Acabou nao sendo um problema: o Alef mesclou
o PR #3 sozinho, ao detectar os commits na base.

### 4.4 Niveis e badges do membro

O `CONTINUACAO.md` manda perguntar antes, e as decisoes de produto nao foram tomadas.
**Nao implementar sem o Alef decidir.**

---

## 5. Proximos passos para a sessao local

### Passo 1 — Descobrir o estado real antes de agir

O Alef pode ter feito o deploy a mao. Nao presuma:

```bash
ssh premium-vps
sqlite3 /home/user/htdocs/socios-premiums/data/socios-premiums.sqlite ".tables" | tr ' ' '\n' | grep notif
systemctl is-active socios-premiums
ls -t /root/backups/ | head
crontab -l
```

- `community_notifications` existe -> **o deploy ja foi feito. Nao refaca.** Va ao passo 3.
- nao existe -> siga para o passo 2.

### Passo 2 — Deploy

Use `scripts/DEPLOY-RAPIDO.md` (6 comandos) ou `scripts/DEPLOY-PASSO-A-PASSO.md`.

Resumo da rota curta: `tar` do `src` atual como rollback, `curl` do tarball da branch,
trocar `src`, `npm run build`, copiar estaticos, `systemctl restart socios-premiums`.

**Depois do restart, confira a contagem de afiliados.** Ela nao protege os registros — o Alef
definiu que os 17 membros nao tem valor real. Ela detecta se o app subiu apontando para
**outro banco**: se vier `0` ou `1`, o `SOCIOS_DB_PATH` se perdeu e o app criou um banco
dentro de `.next/standalone/data`, pasta que o proximo build apaga. O prejuizo nao seria o
passado — seriam os cadastros **futuros**.

### Passo 3 — ~~Mesclar o PR #3~~ FEITO

Fechado como merged pelo proprio GitHub quando o `main` avancou por fast-forward. Nada a fazer; o `gh pr ready 3` previsto aqui nunca foi necessario.

### Passo 4 — ~~Backup diario~~ FEITO

Instalado na VPS em 2026-11-04 pela sessao local: banco as 03h00, `data/uploads/` as 03h30,
retencao de 14 dias. O proprio `setup-backups.sh` provou a copia na hora, e ela abriu com 17
afiliados.

A copia **fora** da VPS tambem foi resolvida: `scripts/puxar-backups.sh` roda na maquina
local, traz os arquivos e confere que o `.sqlite` abre, em vez de so copiar bytes. Ja rodou
uma vez. Vale repetir toda semana.

### Passo 5 — ~~Disco da VPS~~ FEITO

`npm cache clean --force` liberou 2,1 GB: o disco saiu de 91% para 89%, com 11 GB livres, e
`/root/.npm` ficou em 5,2 MB. O que ainda ocupa espaco e de outros projetos na VPS.

### Passo 5 — Disco da VPS

Estava em 91%, com 8,7 GB livres. Ha ~2,1 GB em `/root/.npm` recuperaveis com
`npm cache clean --force`. Nao apaga nada do site.

### Passo 6 — Registrar o que aconteceu

Atualizar `ai/current-focus.md` com o commit que foi para producao, e qualquer outro arquivo
de `ai/` que tenha ficado desatualizado. **Isso e parte do trabalho, nao um extra** — sem
isso a proxima sessao recomeca do zero, como esta recomecou.

---

## 6. Pontos em aberto

### 6.1 Saques — RESPONDIDO em 2026-11-04: nao ha nenhum

A sessao local conferiu direto no banco de producao:
`SELECT status, COUNT(*) FROM withdrawals GROUP BY status` devolve **zero linhas**.

Nao ha dinheiro devido a ninguem. O trecho do `CONTINUACAO.md` que fala em *"16 membros
reais e saques envolvidos"* estava velho. Com isso, a decisao do Alef sobre os 17 membros
nao esbarra em nenhuma obrigacao financeira.

### 6.2 Limites conhecidos das notificacoes

Nao sao defeitos, sao escolhas de escopo — registradas para ninguem reportar como bug:

- **So o autor da publicacao e avisado.** Quem comentou antes nao e avisado de comentarios
  novos na mesma publicacao.
- **Admin nunca recebe**, por nao ter linha em `affiliates`. O modulo suporta
  `actorType: "admin"`, mas esse caminho **nao e acionado hoje**: nao existe acao de admin que
  comente ou publique na comunidade.
- **A reacao so existe na listagem do espaco**, nao na pagina da publicacao — ali o card de
  reacoes nao e renderizado. E onde a UI sempre esteve; nao mudou nada nisso.

### 6.3 Membro de teste em producao

`teste.comunidade@premiummember.local` (id 23) continua ativo e entra nas contagens.

### 6.4 A mencao com `@` — a base ja existe

Falta decidir **como identificar a pessoa**: nome nao e unico em `affiliates`, e o formulario
e um `<textarea>` sem autocomplete. Decidido isso, a notificacao e so chamar `insert` com
`kind: "mention"` em `src/lib/notifications.ts`.

---

## 7. O que ainda falta

Tudo que este documento listava como proximo passo foi feito em 2026-11-04: backup diario,
deploy, verificacao, mesclagem do PR #3 e limpeza de disco. **Nao ha tarefa pendente de
engenharia.**

O que resta depende de decisao do Alef, nao de codigo:

1. **Niveis e badges do membro** — quantos niveis, nomes e peso de cada criterio. O
   `CONTINUACAO.md` manda perguntar antes, e continua valendo.
2. **Mencao com `@`** — falta decidir como identificar a pessoa (nome nao e unico em
   `affiliates`, e o formulario e um `<textarea>` sem autocomplete).
3. **Membro de teste em producao** — apagar ou nao antes de divulgar.

E uma rotina que vale manter: rodar `scripts/puxar-backups.sh` toda semana. Backup que mora
so no servidor nao e backup, e um que ninguem verifica so se descobre quebrado no pior dia.
