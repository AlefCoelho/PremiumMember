# Mapeamento da plataforma de referencia (Circle) e modelo para o Premium Member

Navegado em 2026-11-04 no Chrome do Alef, logado, em
`https://maestros-da-ia.circle.so`. Tudo abaixo foi visto na tela, nao deduzido.

---

## 1. Navegacao global

**Barra do topo** (sempre visivel, 5 destinos + 5 acoes):

| Destino | Rota | O que e |
|---|---|---|
| Home | `/feed` | feed agregado de todos os espacos |
| **Courses** | `/courses` | **galeria de cursos, separada dos espacos** |
| Events | `/events` | calendario de lives |
| Members | `/members` | diretorio de membros |
| Leaderboard | `/leaderboard` | ranking/gamificacao |

Acoes a direita: busca, notificacoes (com contador), DMs, favoritos, menu do usuario.

**Lateral esquerda**: grupos colapsaveis, cada espaco com **emoji proprio** e
**badge de nao lidos**. Os grupos vistos:

```
Feed
Boas-Vindas          📍 Comece por aqui · 👤 Apresente-se aqui
Chat e Suporte       🆘 Suporte Tecnico · 💬 Chat Comunidade
Aulas                🤖 Formacao Maestros da IA
Agentes de IA        🔶 Claude Code (Aulas) · 🏹 Hermes · Codex ·
e Harness            ⚜️ Skills Prontas · 🤖 Agentes Prontos · ⚒️ Arsenal
APPS                 📱 Apps Maestros · 👨‍💻 Apps Comunidade
AI Updates           News
Eventos e Encontros  🗓️ LIVES (Agenda) · 👥 LIVES (Gravacoes)
Business             💻 Implementacao · 📊 Clube de Negocios · 🚀 Estamos Contratando ·
                     🤖 Maestro Atende · 🎬 Fabrica de Conteudo Autonoma
Central de Assinatura 🎁 Recompensas · ☎️ Gerenciar Assinatura
Sugestoes e Feedbacks
Comunidade Gratuita  (5 espacos abertos, isca de upgrade)
Links                app Android · app iOS
```

**A leitura que importa:** um espaco de aulas **tambem e um curso**. "Claude Code
(Aulas)" aparece na lateral como espaco e em `/courses` como curso, com a mesma
URL `/c/claude-code-aulas`. Isso e exatamente a decisao que ja tomamos no Premium
Member (curso = espaco `kind='lessons'`), confirmada na pratica.

---

## 2. `/courses` — a galeria

Cards em grade, cada um com:
- **capa** do curso
- **barra de progresso + "% completo"** (vi 71%, 90%, 50%, 45%, 10%, 0%)
- **titulo** e, abaixo, **o grupo** a que pertence ("Agentes de IA e Harness")

Abas no topo: **"Todos os cursos" | "Meus cursos"**.

Nove cursos ativos, espalhados por quatro grupos diferentes.

---

## 3. Pagina do curso (`/c/<curso>`)

```
Claude Code (Aulas)                                  [ Continuar ]

Progresso do curso
20 de 28 aulas concluidas                                      71%
[========================================--------------]

Conteudo                                                [Recolher]
9 secoes · 28 aulas · 5 h 43 min

  ▾ Como o Claude Code Funciona                            6 aulas
     ✓ [thumb] Introducao                                    05:35
     ✓ [thumb] Visual Studio Code x Cursor x Antigravity      01:50
     ...
  ▾ O Cerebro do Claude Code                               3 aulas
  ...
  ▸ Em Breve
```

Elementos: botao **Continuar** (vai para a proxima nao concluida), contagem
absoluta **e** percentual, resumo **secoes · aulas · duracao total**, **Recolher**
para fechar tudo de uma vez, secoes em acordeao com contagem propria, e cada aula
como **check + miniatura + titulo + duracao**.

Uma secao chamada **"Em Breve"** anuncia o que ainda vem. Isso retem.

---

## 4. Pagina da aula (`/c/<curso>/sections/<id>/lessons/<id>`)

Layout de **duas colunas, em tela cheia** — sai do layout da comunidade:

**Barra superior:** nome do curso · favoritar · **← →** (aula anterior/proxima) ·
botao **"Concluido"**.

**Rail esquerdo** (recolhivel pelo icone no canto): **"20 de 28 concluidos — 71%"**
com barra, e a lista inteira de secoes e aulas, cada uma com miniatura e o selo
**"Concluido"**. A aula atual fica destacada.

**Coluna principal:**
1. **player de video** 16:9 (velocidade, legendas, PiP, tela cheia)
2. **titulo** da aula
3. **corpo rico**: imagem de capa, paragrafos, listas com emoji, negrito
4. **anexo em card**: icone + nome + tamanho (`estaleiro.zip — 13.84 KB`)
5. **abas "Comentarios | Arquivos"**
   - Arquivos: tabela **Nome / Tamanho**
   - Comentarios: **por aula**, com anexo, imagem, GIF, emoji, # e @

**Descoberta que muda o nosso escopo:** nem toda aula tem video. O curso
**"Agentes Prontos"** tem 21 aulas **sem duracao nenhuma** — sao fichas de texto
com um ZIP para baixar. E literalmente o "arsenal de agentes prontos para baixar"
que o Alef vende na pagina de apresentacao.

---

## 5. Events

Calendario mensal, com alternancia **lista | calendario**. Os eventos aparecem
como etiquetas nos dias; os passados ficam esmaecidos.

---

## 6. O que o Premium Member ja tem, e o que falta

### Ja implementado e equivalente
| Referencia | Premium Member |
|---|---|
| Curso = espaco de aulas | `kind='lessons'` → `getMemberCourse` |
| Secoes | `course_modules` |
| Aulas com video e duracao | `course_lessons` (`video_id`, `duration_minutes`) |
| Arquivos da aula | `lesson_materials` + `/materiais/[id]` autenticado |
| Progresso por aula | `lesson_progress` |
| "X de Y concluidas" + barra | `CourseTrail` |
| Anterior/proxima | `getNextLesson` |
| Travar conteudo | `min_eligible_sales` (a referencia **nao tem** isso) |

### Falta, em ordem de impacto

1. **Galeria `/socio/cursos`** — hoje so se chega a um curso pela lateral. A
   galeria com capa e progresso e o que faz o membro ver que existem **nove**
   cursos, nao um. Precisa de `cover_path` no espaco e de uma rota nova.
2. **Aula sem video** — ja funciona (`video_provider='none'`), mas a trilha
   mostra "sem video" como se faltasse algo. Precisa de um tipo explicito de aula
   de **material** (ficha + download), que e o formato do arsenal de agentes.
3. **Resumo do curso**: "N secoes · N aulas · tempo total". O tempo total e so
   somar `duration_minutes`; falta exibir.
4. **Miniatura por aula** — a lista da referencia e varrida com o olho pelas
   imagens. Hoje a nossa e so texto. Campo `thumb_path` em `course_lessons`.
5. **Layout de aula em tela cheia**, com rail de navegacao do curso ao lado. Hoje
   a aula abre dentro do layout da comunidade, com a lateral de espacos do lado —
   que nao ajuda em nada enquanto se assiste.
6. **Comentarios por aula** — a referencia tem; nos temos comentario so em
   publicacao. Da para reaproveitar `community_comments` com uma coluna de
   origem, sem tabela nova.
7. **Favoritar aula** — temos favorito de publicacao, nao de aula.
8. **Secao "Em Breve"** — um `status='coming_soon'` no modulo, que aparece
   fechado e sem link. Custa quase nada e retem.
9. **Emoji por espaco** e **badge de nao lidos** na lateral.
10. **Members e Leaderboard** — a referencia tem; nos nao. O Leaderboard conversa
    com as vendas que ja contamos.

### O que NAO copiar
- **Leaderboard antes de ter membros ativos** — ranking vazio deprime.
- **"Comunidade Gratuita"** — e uma estrategia de funil que so faz sentido com
  dois niveis de assinatura. O Premium Member tem um.
- **DMs** — mensagem privada entre membros abre um canal de spam e de venda por
  fora que o Alef nao quer, e ele ja proibiu link externo na comunidade.

---

## 7. Proposta de ordem

**Etapa 1 — fecha a lacuna visivel (1, 3, 4, 5)**
Galeria de cursos com capa e progresso; resumo do curso; miniatura por aula;
layout de aula em tela cheia com rail. E o que faz a area de aulas **parecer** uma
area de aulas.

**Etapa 2 — o arsenal (2, 8)**
Tipo de aula "material", com ficha e download em destaque, e secao "Em Breve".
E o que entrega a promessa da pagina de vendas.

**Etapa 3 — convivencia (6, 7, 9)**
Comentario por aula, favoritar aula, emoji e badge na lateral.

**Etapa 4 — so quando houver gente (10)**
Diretorio de membros e ranking.
