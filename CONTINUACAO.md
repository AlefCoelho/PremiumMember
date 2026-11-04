# Continuacao — estado do projeto e o que falta

Documento para quem pegar este projeto depois, inclusive outra sessao de Claude Code.
Atualizado em 2026-11-04, com producao no commit `254cb6a`.

## O que e o Premium Member

Plataforma em Next.js 16 (App Router) + SQLite (better-sqlite3, modo WAL) do Alef Coelho.
Comecou como painel de afiliados e virou plataforma unica: comunidade, aulas, suporte e
central de afiliados no mesmo lugar.

**Regra que nao se quebra:** o motor de comissao e o diferencial do produto. Nenhuma
alteracao pode tocar `affiliates`, `referrals`, `withdrawals`, `payment_orders` ou
`commissions`. Todas as tabelas novas foram criadas com `CREATE TABLE IF NOT EXISTS`, em
tabelas separadas, justamente para nunca precisar de `ALTER TABLE` no deploy.

## Como esta organizado hoje

### Portal do membro (`/socio`, cookie `sp_affiliate_session`)

| Rota | O que e |
|---|---|
| `/socio` | Redireciona para a comunidade. A casa do membro e o feed. |
| `/socio/comunidade` | Feed, com as colunas "Eventos futuros" e "Publicacoes em alta" a direita |
| `/socio/comunidade/[space]` | Espaco, com publicacoes e o formulario de publicar |
| `/socio/comunidade/[space]/[postId]` | Publicacao e comentarios |
| `/socio/comunidade/favoritos` | O que o membro salvou |
| `/socio/comunidade/eventos` | Eventos & Encontros: proximos e gravados |
| `/socio/comunidade/perfil` | Foto de perfil |
| `/socio/ganhos` | Indicacoes, comissoes e saques (era o antigo `/socio`) |
| `/socio/login`, `/socio/recuperar-senha`, `/socio/redefinir-senha` | Acesso |

### Portal do admin (`/`, cookie `sp_session`)

| Rota | O que e |
|---|---|
| `/` | Painel de membros, indicacoes, saques, regras, construtor de estrategia |
| `/admin/comunidade` | Grupos e espacos: criar, renomear, reordenar, arquivar |
| `/admin/eventos` | Agendar lives e ver quem confirmou presenca |
| `/admin/senhas` | Gerar link de redefinicao de senha para um membro |

Os dois portais tem cookies separados e convivem na mesma sessao de navegador.

## Decisoes que valem conhecer antes de mexer

**Reacoes.** Cinco tipos (`like`, `dislike`, `heart`, `money`, `sad`), uma por membro por
publicacao: clicar em outra troca, clicar na mesma remove. As contagens saem de duas
consultas agregadas para a lista toda (`attachPostMeta`), nao de duas por publicacao.

**Link externo.** Membro nao publica link, nem em publicacao nem em comentario
(`containsExternalLink`). Admin publica. A validacao devolve a pessoa para a propria
pagina com aviso, nunca lanca excecao — lancar dava tela de erro de servidor.

**Imagens.** A reducao acontece no navegador, em `ImageUploadField`, antes do upload:
redimensiona e converte para WebP, baixando a qualidade por etapas ate caber em 2 MB. Sem
modulo nativo no servidor. No teste, 3149 KB viraram 19 KB.

**Onde as imagens ficam.** Em `data/uploads/`, ao lado do banco, NUNCA em `public/`: na
saida standalone o `public` e recriado a cada build e o que o membro enviasse sumiria no
deploy seguinte. Quem serve e a rota `/uploads/[...file]`, que exige sessao e so aceita o
padrao de nome que nos mesmos geramos (barra path traversal).

**Trocar de armazenamento.** Toda gravacao passa por `src/lib/storage.ts`. Migrar para
Cloudflare R2 ou Supabase e mexer so nesse arquivo. Pelas contas, 1 GB aguenta dezenas de
milhares de imagens no tamanho atual, entao nao ha pressa.

**Nao use `path.join` dinamico no escopo de modulo.** O rastreio de arquivos do Turbopack
conclui que o projeto inteiro e dependencia e incha a saida standalone. Em `storage.ts` a
resolucao do diretorio ficou numa funcao com cache por causa disso.

**Senha.** Token de 32 bytes guardado como hash SHA-256, valido por 60 minutos, uso unico,
e um pedido novo invalida o anterior. O envio por e-mail e opcional: so acontece com
`RESEND_API_KEY` e `MAIL_FROM` no ambiente, via API HTTP, sem dependencia nova. Sem elas,
o admin gera o link em `/admin/senhas` e entrega pelo canal que ja usa.

**Eventos.** O admin cola o link do Google Meet; o sistema nao cria a sala. O botao de
entrar aparece de 10 minutos antes ate o fim da live, com 15 minutos de folga.

**InfinitePay.** Esta desligada. `isInfinitePayEnabled()` exige `INFINITEPAY_HANDLE`,
`PREMIUM_MEMBER_API_SECRET` e `INFINITEPAY_WEBHOOK_SECRET`; sem as tres, as rotas de
checkout e webhook respondem 404. Configurando as chaves, elas voltam sozinhas.

## O que falta

### 1. Niveis e badges do membro (pedido, nao comecado)

O Alef pediu: abaixo do nome, um simbolo representando o nivel, baseado no tempo de
comunidade e na quantidade de likes e favoritos recebidos; ao subir de nivel, o membro
recebe um aviso de parabens. Ele mesmo disse "podemos pensar melhor com calma" — as
decisoes de produto (quantos niveis, nomes, peso de cada criterio) ainda nao foram
tomadas. **Pergunte antes de implementar.**

Os dados ja existem: `community_reactions` e `community_favorites` dizem quanto o membro
recebeu, e `affiliates.created_at` da o tempo de casa.

### 2. Marcar membros nas publicacoes (`@`)

Mencionado no pedido original, nao implementado. Vale pouco sozinho: sem notificacao,
ninguem fica sabendo que foi marcado. Considere fazer junto com notificacoes.

### 3. Backup automatico do banco (recomendado, nao feito)

Hoje so existem os backups manuais que precedem cada deploy, em `/root/backups/` e em
`find-skills/backups-producao/`. Com 16 membros reais e saques envolvidos, vale um cron
diario. O `DEPLOY.md` traz o comando; falta tambem tirar copia para fora da VPS, porque
backup que mora so no servidor nao e backup.

### 4. Disco da VPS

91% cheio, 8,7 GB livres. O Premium Member ocupa ~700 MB; o grosso sao 58 GB em
`/home/user` de outros sites. Ha 2,1 GB de cache npm em `/root/.npm` que sai com
`npm cache clean --force`.

### 5. Membro de teste em producao

`teste.comunidade@premiummember.local` (id 23) continua ativo e entra nas contagens.
Decidir se apaga antes de divulgar.

## Deploy

O runbook completo esta em `DEPLOY.md`. Resumo do que funciona hoje:

1. Backup WAL-safe: `sqlite3 <db> ".backup '/root/backups/socios-$(date +%F-%H%M).sqlite'"`
   — nunca `cp` do `.sqlite`, porque o WAL costuma estar maior que o arquivo principal.
2. Copiar o backup para fora da VPS.
3. `tar czf` do `src/` atual, como ponto de rollback.
4. `scp -r src/. premium-vps:/home/user/htdocs/socios-premiums/src/`
5. `npm run build` na VPS (sem `npm ci`, enquanto nao houver dependencia nova).
6. `cp -r .next/static .next/standalone/.next/` e `cp -r public .next/standalone/`
7. `systemctl restart socios-premiums`
8. Conferir `affiliates: 17` e `admins: 2` DEPOIS do restart. Se mudou, rollback na hora.

A pasta de producao nao e um repositorio git: o deploy copia arquivos. Manter o GitHub
atualizado e um passo separado — depois do deploy, `main`, `feat/comunidade` e
`feat/admin-comunidade` sao avancadas por fast-forward para o mesmo commit.

## Ambiente

- VPS: `root@2.24.65.26`, atalho SSH `premium-vps`, projeto em
  `/home/user/htdocs/socios-premiums`, servico `socios-premiums.service`, porta 3020 atras
  do nginx, Node v22.23.1.
- Banco: `data/socios-premiums.sqlite`, com `SOCIOS_DB_PATH` absoluto no unit do systemd.
- Dev local: `SOCIOS_DB_PATH` apontando para um arquivo descartavel, `npx next dev -p 3021`.
  Admin de desenvolvimento: `admin@premiummember.local` / `admin123` (vem do `.env.example`;
  em producao as credenciais sao outras).

## Antes de divulgar para alunos novos

- Cadastro publico funciona: `/cadastro-membro` cria a conta, loga e abre a dashboard.
- Recuperacao de senha funciona, mas **sem e-mail automatico** enquanto `RESEND_API_KEY`
  nao for configurada. O admin gera o link e entrega.
- Pagamento **nao funciona**: a InfinitePay esta desligada, por decisao do Alef, que vai
  usar um sistema externo provisorio.
