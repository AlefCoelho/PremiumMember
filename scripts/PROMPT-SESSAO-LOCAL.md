# Instrucao para a sessao local do Claude Code

## Antes de abrir o Claude Code

No terminal, dentro da pasta do projeto:

```
git fetch origin
git checkout memoria-operacional
```

A pasta `ai/`, com a memoria do projeto, so existe nesta branch. Abrindo o Claude Code no
`main`, ele nao enxerga nada do que foi preparado e refaz tudo do zero.

---

## A mensagem para colar

```
Estou na branch memoria-operacional, com o PR #3 aberto. Antes de qualquer coisa, leia a
pasta ai/ — e a memoria operacional do projeto, feita para voce nao precisar varrer o
codigo. Comece por ai/README.md e ai/current-focus.md.

CONTEXTO DO QUE JA FOI FEITO

Uma sessao do Claude Code na nuvem preparou tudo que nao dependia da VPS. Ela nao alcanca a
VPS: nao ha cliente ssh no container e a porta 22 nao responde pelo proxy HTTPS. Entao o que
precisa da VPS ficou para voce — ou ja foi feito pelo Alef a mao.

O que entrou na branch:

- Notificacoes da comunidade. O autor e avisado quando alguem comenta ou reage na publicacao
  dele. Tabela nova e separada (community_notifications), criada por CREATE TABLE IF NOT
  EXISTS no import, sem migracao. Verificada com navegador num banco descartavel: comentario,
  reacao, troca de reacao, retirada de reacao, marcar como lidas e ausencia de
  auto-notificacao. Build e lint limpos, 25 rotas.
- DEPLOY.md corrigido. Ele nao mencionava os uploads em ponto nenhum, e tinha tres erros que
  travariam um deploy no meio (git pull numa pasta que nao e repositorio git, restart do
  servico com nome errado, e verificacao de telas que nao existem mais).
- ai/ — memoria operacional, dez arquivos.
- scripts/ — guias passo a passo de backup e de deploy, e setup-backups.sh.

PRIMEIRA COISA A FAZER: DESCOBRIR O ESTADO REAL

Nao presuma. Confira na VPS antes de agir:

  ssh premium-vps
  ls -t /root/backups/ | head
  sqlite3 /home/user/htdocs/socios-premiums/data/socios-premiums.sqlite ".tables" | tr ' ' '\n' | grep notif
  systemctl is-active socios-premiums

Se community_notifications existir, o deploy ja foi feito — NAO refaca. Confirme que o site
responde e siga para o que falta.

Se nao existir, o deploy ainda nao aconteceu. Use scripts/DEPLOY-RAPIDO.md (seis comandos) ou
scripts/DEPLOY-PASSO-A-PASSO.md (completo, com backup de dados).

REGRA QUE NAO SE QUEBRA

Nenhuma alteracao pode tocar as tabelas affiliates, referrals, withdrawals ou payment_orders.
Esta em ai/known-issues.md, item 0. Toda tabela nova nasce separada, com CREATE TABLE IF NOT
EXISTS, para o deploy nunca precisar de ALTER TABLE.

SOBRE OS 17 MEMBROS

O Alef definiu em 2026-11-04 que os 17 membros em producao sao de um projeto antigo, sem
valor real, e podem ser recadastrados. Nao trate esses dados como sagrados. Mas continue
conferindo a contagem depois de todo restart: ela nao protege os registros, ela detecta se o
app subiu apontando para outro banco — a armadilha do SOCIOS_DB_PATH, que ja custou um banco
neste projeto. Contagem inesperada significa cadastros futuros indo para uma pasta que o
proximo build apaga.

Ponto nao resolvido: o CONTINUACAO.md menciona "saques envolvidos". Se houver saque pendente
em withdrawals, isso e dinheiro devido a alguem. Confira antes de qualquer limpeza:
  sqlite3 <banco> "SELECT status, COUNT(*) FROM withdrawals GROUP BY status;"

O QUE FALTA, EM ORDEM

1. Deploy, se ainda nao foi feito.
2. Mesclar o PR #3, para main e producao ficarem iguais.
3. Backup diario, se ainda nao instalado: scripts/setup-backups.sh. Cobre o banco E as
   imagens dos membros, que vivem em data/uploads/, fora do banco.
4. Disco da VPS em 91%. Ha 2,1 GB em /root/.npm recuperaveis com npm cache clean --force.

Depois de qualquer alteracao, atualize os arquivos de ai/ que ficaram desatualizados, e
registre em ai/current-focus.md qual commit esta em producao. E parte do trabalho, nao extra.
```

---

## O que segurar com o Alef

Tres itens do `CONTINUACAO.md` continuam dependendo de decisao dele:

- **Niveis e badges do membro** — o proprio documento manda perguntar antes: quantos niveis,
  nomes e peso de cada criterio nao foram decididos. Nao deixe implementarem sem ele decidir.
- **Mencao com `@`** — a base (notificacoes) ja existe. Falta decidir como identificar a
  pessoa: nome nao e unico em `affiliates`, e o formulario e um `<textarea>` sem autocomplete.
- **Membro de teste em producao** — `teste.comunidade@premiummember.local` esta ativo e entra
  nas contagens.
