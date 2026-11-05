# Estado atual

Atualizado em 2026-11-04. **As notificacoes da comunidade estao em producao** desde
2026-11-04. Conferido depois do restart: 17 afiliados, 2 admins, `community_notifications`
criada, `data/uploads/` intacto com `avatars/` e `posts/`, e as classes `notification-row` e
`notification-avatar` presentes na folha de estilo servida. Nenhum erro no journal.

**O codigo em producao e o de `53c1399`.** O `main` seguiu adiante, e os commits a frente
sao **so documentacao** (`ai/` e `BLUEPRINT.md`), nenhum codigo. Entao producao esta em dia
no que importa. Confira o commit atual do `main` com `git rev-parse --short origin/main`,
em vez de confiar no numero escrito aqui, que envelhece a cada commit.

O **PR #3 foi fechado como merged pelo proprio GitHub**, nao por alguem clicando no botao:
ao avancar o `main` por fast-forward ate os commits da `memoria-operacional`, o GitHub
reconheceu que tudo ja estava na base e fechou sozinho. Draft impede mesclar pelo botao,
nao impede esse fechamento automatico. Por isso o `gh pr ready 3` que o blueprint previa
nunca foi necessario.

> Daqui em diante `main` e producao podem divergir. Olhar o GitHub nao responde mais o que
> esta no ar. Para saber se um deploy aconteceu, pergunte ao banco de producao, nao ao
> repositorio — por exemplo, se a tabela de um recurso novo ja existe la.

## Novidades de 2026-11-04 (tarde)

- **Comunidade com cara de app no celular.** Abaixo de 820px os cinco destinos viram barra
  fixa no rodape e a lista de espacos vira um seletor que abre. Usa
  `env(safe-area-inset-bottom)` e `viewportFit: "cover"`. Campos de formulario com 16px,
  senao o iPhone da zoom ao focar.
- **Pagina publica `/apresentacao`**, com rolagem por secoes, a aura do login e dourado nas
  palavras de destaque. A primeira secao depois do topo e o **arsenal de agentes de IA**,
  que e o argumento principal do produto: agentes prontos para baixar, workflows, automacoes
  para Claude Code e Codex, e a conta de quanto tempo se economiza. O texto de apoio e
  branco nesta pagina (`--muted` redefinido dentro de `.lp`), nao cinza como no painel.
  O botao de adquirir pulsa e leva para a fatura da InfinitePay em aba nova — o checkout
  interno segue desligado, entao o pagamento acontece fora e o cadastro vem depois.
- **`contatoalefcoelho@gmail.com` e administrador** em producao. A senha foi gerada e
  gravada num arquivo fora do repositorio, e conferida contra o hash. Atencao ao gravar
  hash bcrypt por SSH: o `$` e comido pelo shell — mande por arquivo .sql, nunca inline.
- **Subdominio `admin.premiummember.online`**: o bloco HTTP ja esta no nginx e ligado, com
  os outros sites da VPS conferidos antes e depois do reload. **Falta o registro A na
  Hostinger**, que so o Alef cria. Depois disso, `scripts/ativar-subdominio-admin.sh
  --aplicar` emite o certificado. O subdominio e organizacao: quem separa admin de membro
  continua sendo o cookie.

## O que e

Plataforma unica do Alef Coelho: comunidade, aulas, suporte e central de afiliados no mesmo
lugar. Comecou como painel de afiliados.

## No ar

https://premiummember.online — VPS `root@2.24.65.26` (atalho SSH `premium-vps`), projeto em
`/home/user/htdocs/socios-premiums`, servico `socios-premiums.service`, porta 3020 atras do
nginx, Node v22.23.1. Banco em `data/socios-premiums.sqlite`, com `SOCIOS_DB_PATH` absoluto
no unit do systemd.

Producao: **17 afiliados, 1 admin** (em 2026-11-04). Conferir esses dois numeros **depois**
de todo restart — nao para proteger os registros, e sim para detectar se o app subiu
apontando para outro banco. Contagem muito menor que a esperada significa que o
`SOCIOS_DB_PATH` se perdeu.

O numero de afiliados **cresce sozinho** conforme gente se cadastra por
`/cadastro-membro`; confira o valor atual antes de usar como referencia. O segundo admin,
`admin@sociospremiums.local` (id 1), de um dominio antigo, foi apagado em 2026-11-04 a
pedido do Alef — nao tinha publicacao nem comentario. Hoje so existe
`admin@premiummember.local` (id 11).

Dev local: `SOCIOS_DB_PATH` para um arquivo descartavel, `npx next dev -p 3021`.
Admin de dev: `admin@premiummember.local` / `admin123` (do `.env.example`; producao e outra).

## Duas mudancas de rumo recentes

**A comunidade virou a casa do membro.** `/socio` so redireciona para `/socio/comunidade`.
Indicacoes, comissoes e saques foram para `/socio/ganhos`.

**A InfinitePay esta desligada**, por decisao do Alef, que usa um sistema externo
provisorio. Checkout e webhook respondem 404 sem as chaves. Nenhuma comissao entra
automaticamente; `paid_at` e lancado pelo admin.

## O que falta

### 1. Niveis e badges do membro — pedido, nao comecado

Simbolo de nivel abaixo do nome, por tempo de comunidade + likes e favoritos recebidos, com
aviso de parabens ao subir. O Alef disse "podemos pensar melhor com calma": quantos niveis,
nomes e peso de cada criterio **nao foram decididos**. **Pergunte antes de implementar.**

Os dados ja existem: `community_reactions`, `community_favorites` e `affiliates.created_at`.

### 2. Marcar membros com `@` — a base ja existe

As **notificacoes** foram feitas (comentario e reacao na sua publicacao), que era a parte
que faltava para a mencao valer alguma coisa. Falta a mencao em si.

O ponto em aberto e **como identificar a pessoa**: nome nao e unico em `affiliates`, e o
formulario e um `<textarea>` simples, sem autocomplete. Decidir isso antes de implementar.
Uma vez escolhido, a notificacao e so chamar `insert` com `kind: "mention"` em
`src/lib/notifications.ts`.

### 3. Backup automatico — INSTALADO em 2026-11-04

Rodando na VPS, instalado por `scripts/setup-backups.sh --aplicar`:

- **03h00** — banco, com `sqlite3 ".backup"`, retencao de 14 dias
- **03h30** — `data/uploads/` em tar.gz, mesma retencao

O proprio script provou o backup na hora de instalar: a copia abriu com 17 afiliados.
O crontab anterior ficou guardado em `/root/backups/crontab-antes-*.txt`.

Para tirar copia **fora** da VPS existe `scripts/puxar-backups.sh`, que roda na maquina
local, traz os arquivos para `find-skills/backups-producao/` e **confere que o .sqlite
abre**. Ja rodou uma vez com sucesso. Falta agendar no Agendador de Tarefas do Windows,
depois das 3h30 — enquanto isso, rodar a mao de vez em quando.

### 4. Disco da VPS em 89%

11 GB livres. Em 2026-11-04 foram liberados 2,1 GB com `npm cache clean --force`, que
deixou `/root/.npm` em 5,2 MB. O servico continuou ativo e o site respondendo 200.

O que resta e de outros projetos na VPS, nao do Premium Member: ~58 GB em `/home/user`.
O proprio projeto ocupa ~700 MB. Ver `known-issues.md` item 9.

### 5. Membro de teste em producao — RESOLVIDO

`teste.comunidade@premiummember.local` (id 23) foi apagado em 2026-11-04 a pedido do Alef.
Nao tinha publicacao, comentario, reacao, favorito, indicacao nem saque, e nao era
patrocinador de ninguem — conferido um a um antes, com backup na frente.

### 6. Saques — conferido, nao ha nenhum

O `CONTINUACAO.md` falava em "saques envolvidos". Conferido em 2026-11-04 direto no banco
de producao: `SELECT status, COUNT(*) FROM withdrawals GROUP BY status` devolve **zero
linhas**. Nao ha dinheiro devido a ninguem. O trecho do `CONTINUACAO.md` estava velho.

### Sobre os 17 membros de producao

O Alef definiu em 2026-11-04 que sao de um projeto antigo, sem valor real, e podem ser
recadastrados. Nao trate como dado sagrado.

**Mas continue conferindo a contagem depois de todo restart.** Ela nao protege os registros:
detecta se o app subiu apontando para outro banco (`known-issues.md` item 1). Contagem
inesperada significa cadastros **futuros** indo para pasta que o proximo build apaga.

Sobre os saques, ver o item 6 acima: conferido, nao ha nenhum.

## Antes de divulgar para alunos novos

- Cadastro publico **funciona**: `/cadastro-membro` cria conta, loga e abre a dashboard.
- Recuperacao de senha **funciona, sem e-mail automatico** enquanto `RESEND_API_KEY` nao for
  configurada. O admin gera o link em `/admin/senhas` e entrega.
- Pagamento **nao funciona**: InfinitePay desligada, sistema externo provisorio no lugar.

## Deploy, resumido

Runbook completo em `DEPLOY.md`, atualizado em 2026-11-04 para bater com a realidade
(uploads, procedimento real por `scp`, nome certo do servico). O que funciona hoje:

1. backup WAL-safe do banco (`sqlite3 ... ".backup ..."`, nunca `cp`) **e tar dos uploads**
2. copiar as duas copias para fora da VPS
3. `tar czf` do `src/` atual, como rollback
4. `scp -r src/. premium-vps:/home/user/htdocs/socios-premiums/src/` (`rsync --delete` se o
   commit apagou arquivo)
5. `npm run build` na VPS — `npm ci` **so** se mexeu em `package.json`
6. `cp -r .next/static .next/standalone/.next/` e `cp -r public .next/standalone/`
7. `systemctl restart socios-premiums` (nao `premium-member`)
8. conferir `affiliates: 17` e `admins: 2` **depois** do restart; mudou, rollback na hora
9. conferir que `data/uploads/` nao esvaziou

A pasta de producao nao e repositorio git. Atualizar o GitHub e passo **separado**: depois
do deploy, `main`, `feat/comunidade` e `feat/admin-comunidade` sao avancadas por
fast-forward para o mesmo commit.

## 2026-11-04 — acesso de admin regerado
- `contatoalefcoelho@gmail.com` (admin id 91) teve a senha redefinida e o login foi
  testado em producao: entra em https://premiummember.online/login e chega ao painel.
  O hash foi conferido contra a senha depois de gravado (aquele bug do `$` expandido
  pelo shell nao volta: o UPDATE foi por arquivo .sql via scp, nao por linha de comando).
- Backup do banco em /root/backups/pre-senha-admin-*.sqlite antes do UPDATE.
- `admin.premiummember.online` AINDA NAO RESOLVE. Falta o registro A na Hostinger
  (admin -> 2.24.65.26). Depois: ssh premium-vps "bash /root/ativar-subdominio-admin.sh --aplicar".
  Enquanto isso o painel funciona normalmente no dominio principal, em /login.
- As aulas sao configuradas em /admin/comunidade: o espaco "Formacao Premium Member"
  ja existe com kind=lessons dentro do grupo "Aulas".

## 2026-11-04 — area de aulas implementada (NAO publicada)
Decisao do Alef: video no YouTube nao listado. Arquitetura em ARQUITETURA-AULAS.md.

Pronto e com `npx tsc --noEmit` e `npx next build` passando:
- `src/lib/lessons.ts`: tabelas course_modules, course_lessons, lesson_materials,
  lesson_progress (aditivas). O curso e o espaco kind='lessons'.
  `extractYoutubeId` aceita watch?v=, youtu.be, /embed/, /shorts/, /live/ e id cru.
  `requiredSalesFor`/`canOpenLesson`: vale a exigencia MAIS ALTA entre espaco e aula.
- `src/lib/storage.ts`: `saveMaterial` (PDF/ZIP/planilha/doc/imagem, teto de 15 MB,
  abaixo do client_max_body_size de 20 MB do nginx), `readMaterial`, `isSafeMaterialPath`.
- `src/app/materiais/[id]/route.ts`: download que RECALCULA a elegibilidade por
  download. Nao reaproveita /uploads de proposito.
- `/admin/aulas` (page + actions): modulos e aulas com criar/renomear/reordenar/
  arquivar/excluir, materiais, link do YouTube. Link "Aulas" somado aos 4 navs admin.
- Membro: `[space]/page.tsx` desvia para `CourseTrail` quando kind='lessons';
  `[space]/aula/[slug]/page.tsx` com player youtube-nocookie 16:9, materiais,
  concluir aula e proxima. Aula travada aparece fechada dizendo quantas vendas faltam.
- CSS novo no fim de globals.css, com bloco @media (max-width: 820px).

### O que FALTA
1. Teste no navegador incompleto: criei modulo e aula pelo painel local e a pagina
   mostrou os dois, mas NAO consegui confirmar no banco — o `next dev` ja rodando
   (PID 26992, porta 3021) grava num data/ que nao e PremiumMember/data nem
   .next/standalone/data. Derrube esse processo e suba um dev limpo antes de confiar.
2. Trilha e pagina de aula do MEMBRO nunca foram abertas. Testar antes de publicar.
3. Nao publicado em producao. Nenhum commit feito.
4. `getLessonCountBySpace()` existe e nao e usada (era para a lateral).
5. Disco da VPS em 89%: limpar antes de abrir upload de material.

## 2026-11-05 — Etapa 1 das aulas pronta (NAO publicada)
Base pedida pelo Alef: "tudo que foi mapeado e uma sessao que o admin pode mudar
— titulo e o que ela sera". Entao nada de estrutura fixa no codigo.

- Tabelas novas `course_presentation` (emoji, headline, cover_path, featured) e
  `lesson_presentation` (kind, thumb_path). Sao tabelas-satelite de proposito:
  community_spaces e course_lessons nao recebem ALTER, regra do projeto.
- `/admin/aulas` ganhou o painel **Vitrine do curso**: titulo, emoji, descricao,
  chamada, capa (upload) e destaque, com previa do card ao lado. O titulo e a
  descricao sao gravados em community_spaces pelo mesmo formulario — o admin nao
  precisa saber dessa divisao.
- Por aula: **tipo** (video / material / texto) e **miniatura**, em formulario
  proprio para nao reenviar imagem ao salvar texto.
- Membro: galeria `/socio/comunidade/cursos` (capa, %, grupo, chamada, travado
  aparece fechado), "Continue de onde parou", e **Cursos** na lateral (a barra de
  baixo do celular foi para 6 colunas).
- Resumo "N secoes - N aulas - X h Y min" no topo do curso.
- **A aula saiu de `/socio/comunidade/[space]/aula/[slug]` para `/socio/aula/[slug]`**
  para escapar do layout da comunidade e abrir em tela cheia, com trilho do curso
  ao lado (`LessonRail`, cliente, aberto no desktop e fechado no celular).
- `storage.ts` aceita a pasta `capas`.
- Slugs reservados em community.ts: um espaco chamado "Cursos"/"Eventos"/etc
  ficaria invisivel atras da rota estatica. Agora ganha sufixo `-espaco`.

### Bug encontrado no teste (corrigido)
O textarea manda **CRLF**, entao `split(/\n{2,}/)` nunca casava e o corpo da aula
virava um paragrafo so. Normaliza `\r\n` antes de separar.

### Testado no navegador, logado como membro
Vitrine salva; aula criada com id do YouTube extraido da URL completa; trilha com
resumo; aula em tela cheia com player; concluir vai de 0/2 para 1/2 e 50%; aula
travada bloqueia com "Faltam 3" sem vazar conteudo; celular em 375px com barra de
6 abas legivel.

### Falta
- Nao publicado, nenhum commit. Banco de producao nao tem as tabelas novas (elas
  sao criadas sozinhas no primeiro boot, por CREATE TABLE IF NOT EXISTS).
- Etapas 2 a 4 do MAPEAMENTO-REFERENCIA.md (arsenal/"Em Breve", comentario por
  aula, favoritar aula, emoji na lateral, membros e ranking).
- Disco da VPS em 89%: limpar antes de abrir upload de capa e material.

## 2026-11-05 — Etapas 2, 3 e 4 no ar (DEPLOY FEITO)
Autorizado pelo Alef: "segue todas as etapas e ao concluir faca o deploy".

- **Etapa 2**: modulo com situacao `coming_soon` ("Em breve": aparece na trilha,
  fechado e sem aula). Tipo de aula video / material / texto.
- **Etapa 3**: comentario por aula (`lesson_comments`, com a mesma proibicao de
  link externo do feed), favoritar aula (`lesson_favorites`, aparece em
  Favoritos como "Aulas salvas"), emoji por espaco na lateral (editavel em
  /admin/comunidade e na vitrine de /admin/aulas).
- **Etapa 4**: `/socio/comunidade/membros` com diretorio e ranking. O ranking
  ordena por vendas liberadas e, no empate, por aulas concluidas; quem esta
  zerado em tudo fica de fora. Nao expoe e-mail, telefone, PIX nem dinheiro.
- `course_presentation` virou **`space_presentation`** e a criacao da tabela
  mudou para community.ts: community.ts consulta essa tabela e carrega ANTES de
  lessons.ts — se a criacao ficasse la, a primeira consulta da lateral quebrava.
- Barra de baixo do celular voltou para 5 abas (Feed, Cursos, Avisos, Salvos,
  Perfil). Eventos e Membros ficam so no computador (`naBarra: false`).

### ARMADILHA DO DEPLOY — ler antes do proximo
`npm run build` gera os estaticos em `.next/static`, mas o servico roda
`node .next/standalone/server.js`, que serve a partir de
`.next/standalone/.next/static`. **Sem copiar, o CSS da 404 e o site inteiro
fica sem estilo.** Foi o que aconteceu neste deploy; achei porque fui conferir o
arquivo .css servido, nao so o build. Todo deploy precisa de:

    cp -r .next/static .next/standalone/.next/
    cp -r public .next/standalone/ 2>/dev/null || true

Depois CONFERIR com `curl -o /dev/null -w '%{http_code}'` no .css que o HTML
referencia. Build verde nao prova que o CSS esta sendo servido.

### Verificado em producao depois do deploy
/apresentacao 200, /login 200, /socio/login 200, rotas fechadas 307, CSS 200 com
as 8 classes novas (63 KB), 17 afiliados e 2 admins intactos, uploads
preservados, 0 erro no log. Backup do banco e dos uploads antes do deploy.

### Falta
- Nenhum commit no git ainda.
- DNS de admin.premiummember.online continua sem resolver (falta o registro A).
- Disco em 89%.
