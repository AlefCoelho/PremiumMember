# O que dizer para o Claude Code local

Cole no terminal, dentro da pasta do projeto, **antes** de abrir o Claude Code:

```
git fetch origin
git checkout memoria-operacional
```

Isso importa: a pasta `ai/` com a memoria do projeto so existe nesta branch. Abrindo o
Claude Code no `main`, ele nao enxerga nada do que foi preparado e refaz tudo do zero.

Depois abra o Claude Code e cole a mensagem abaixo.

---

## A mensagem

```
Estou na branch memoria-operacional, que tem o PR #3 aberto. Antes de qualquer coisa,
leia a pasta ai/ — e a memoria operacional do projeto, feita para voce nao precisar varrer
o codigo. Comece por ai/README.md e ai/current-focus.md.

Regra que nao se quebra: nenhuma alteracao pode tocar as tabelas affiliates, referrals,
withdrawals ou payment_orders. Esta em ai/known-issues.md, item 0.

Contexto: a sessao da nuvem nao alcanca a VPS (nao ha cliente ssh no container e a porta 22
nao responde pelo proxy), entao tudo que precisa da VPS ficou para voce. Producao esta no
commit 254cb6a; main esta em 46b58be, um commit a frente, so documentacao.

O que ha para fazer, nesta ordem:

1. BACKUP ANTES DE TUDO. Nunca houve backup automatico neste projeto. Rode
   scripts/setup-backups.sh na VPS (ou siga scripts/BACKUP-PASSO-A-PASSO.md). Ele instala o
   backup diario do banco E das imagens dos membros — as imagens vivem em data/uploads/, fora
   do banco, e ate agora nenhum backup as cobria.

2. Mesclar o PR #3. Ele tem duas coisas: as notificacoes da comunidade (codigo, precisa de
   deploy) e documentacao (DEPLOY.md corrigido, memoria ai/, scripts — nao precisam de deploy).

3. Deployar, seguindo DEPLOY.md. Ele foi corrigido nesta sessao e agora bate com a VPS real:
   o passo 3 nao usa git pull (a pasta de producao nao e repositorio git), o passo 6 reinicia
   socios-premiums e nao premium-member, e o passo 7 confere as telas que existem hoje.

Sobre as notificacoes: tabela nova e separada (community_notifications), criada por
CREATE TABLE IF NOT EXISTS no import, sem migracao. O rollback e so voltar o codigo. O
recurso foi verificado com navegador num banco descartavel — comentario, reacao, troca de
reacao, retirada de reacao, marcar como lidas e ausencia de auto-notificacao. Build e lint
limpos, 25 rotas.

Depois de qualquer alteracao, atualize os arquivos de ai/ que ficaram desatualizados. E
parte do trabalho, nao um extra.

Nao comece pelo item 3. Deployar uma tabela nova sem backup funcionando e a troca errada.
```

---

## Se ela perguntar o que fazer depois

Tres itens do `CONTINUACAO.md` continuam em aberto:

- **Niveis e badges do membro** — o proprio documento manda perguntar antes: quantos niveis,
  nomes e peso de cada criterio nao foram decididos. Nao deixe implementarem sem voce decidir.
- **Mencao com `@`** — a base (notificacoes) ja existe. Falta decidir como identificar a
  pessoa: nome nao e unico em `affiliates`, e o formulario e um `<textarea>` sem autocomplete.
- **Membro de teste em producao** — `teste.comunidade@premiummember.local` (id 23) esta ativo
  e entra nas contagens. Decidir se apaga antes de divulgar.
