# Arquitetura das Aulas — proposta

Escrito em 2026-11-04, antes de implementar. Nada aqui foi construido ainda.

## 1. O que existe hoje (medido, nao suposto)

- `kind = "lessons"` e **so um rotulo**. O espaco "Formacao Premium Member" existe,
  mas renderiza o mesmo feed de publicacoes dos outros espacos. Nao existe nenhuma
  tabela de aula, modulo, material ou progresso no banco.
- `src/lib/storage.ts` aceita **somente imagem** (webp/jpg/png) em duas pastas
  (`avatars`, `posts`), com teto de 2 MB. PDF e ZIP sao recusados pelo tipo.
- `/uploads/[...file]` **ja exige sessao** de membro ou admin. O padrao de servir
  arquivo fechado esta correto e deve ser reaproveitado.
- `min_eligible_sales` por espaco **ja funciona** e ja filtra lateral, feed,
  favoritos e destaques. O travamento por vendas nao precisa ser reinventado.
- VPS: **86 GB usados de 96 GB, 11 GB livres (89%)**. nginx com
  `client_max_body_size 20m` no site principal. Uploads atuais: 12 KB.

## 2. A decisao que define tudo: video nao fica na VPS

Uma aula de 1 hora em 1080p pesa de 1 a 2 GB. Com 11 GB livres, o curso inteiro
nao cabe — e muito antes de encher, servir video por Node atras do nginx entrega
um arquivo unico, sem qualidade adaptativa: no 4G do celular o aluno assiste
travando. Isso briga de frente com o pedido de "perfeitamente otimizada para
dispositivos moveis".

**Proposta:** o video mora em servico de video (YouTube "nao listado", Vimeo ou
Panda Video) e a plataforma guarda apenas `video_provider` + `video_id`, exibindo
o player embutido. Custo de armazenamento: zero. Entrega adaptativa: de graca.

O que fica **na nossa VPS** e o material de apoio: PDF, planilha, ZIP de agentes,
imagem. Esses sao pequenos e sao justamente o que precisa de area fechada.

## 3. Hierarquia

```
Grupo "Aulas"                        (community_groups — ja existe)
 └─ Espaco kind=lessons              (community_spaces — ja existe)  = O CURSO
     └─ Modulo                       (course_modules)     NOVO
         └─ Aula                     (course_lessons)     NOVO
             ├─ Video                (provider + id, sem arquivo)
             └─ Materiais            (lesson_materials)   NOVO
```

O **curso e o proprio espaco**. Isso nao e economia de tabela: e o que faz as aulas
herdarem de graca a lateral, a ordenacao, o arquivamento e o travamento por vendas
que ja existem e ja estao testados em producao. Mais de um curso = mais de um
espaco `lessons`, criado no painel que voce ja usa.

## 4. Tabelas novas (aditivas, nenhum ALTER)

```sql
course_modules
  id, space_id -> community_spaces, title, position, status, created_at

course_lessons
  id, module_id -> course_modules, title, slug UNIQUE, summary, body,
  video_provider ('youtube'|'vimeo'|'panda'|'none'), video_id,
  duration_seconds, position, status, min_eligible_sales, created_at, updated_at

lesson_materials
  id, lesson_id -> course_lessons, kind ('file'|'link'), label,
  stored_path, size_bytes, mime, position, created_at

lesson_progress
  lesson_id, affiliate_id, completed_at
  UNIQUE (lesson_id, affiliate_id)
```

`slug` da aula segue a regra ja estabelecida: gerado do titulo, unico, e **nunca
muda ao renomear** — link de aula ja divulgado nao quebra.

`min_eligible_sales` aparece **tambem na aula**, nao so no espaco: assim um curso
aberto pode ter uma aula avancada travada, sem precisar de um espaco separado.
A regra de leitura e a mais restritiva entre espaco e aula.

## 5. Storage: o que muda em `storage.ts`

O modulo continua sendo o unico ponto de gravacao (trocavel por R2 depois).
Precisa ganhar:

- pasta nova `materiais`
- lista de tipos: `application/pdf`, `application/zip`, `image/*` ja aceitos,
  e planilha/documento se voce quiser
- teto proprio: **15 MB por material** (abaixo do limite de 20 MB do nginx, com
  folga para o overhead do multipart)
- a regex de caminho seguro passa a aceitar `materiais/<hex>.<ext>`

**Nao reaproveitar a rota `/uploads` para material.** Ela devolve imagem inline.
Material precisa de rota propria, `/materiais/[id]`, que: confere sessao de membro,
**recalcula a elegibilidade** (espaco + aula) e so entao entrega o arquivo com
`content-disposition: attachment`. Sem esse recalculo, quem descobrisse o endereco
baixaria material de aula travada.

## 6. Telas

**Admin — `/admin/aulas`** (nova aba no menu, ao lado de Comunidade e Eventos)
- escolhe o curso (espaco `lessons`)
- modulos: criar, renomear, reordenar, arquivar
- aulas: criar, editar, reordenar, mover de modulo, arquivar, travar por vendas
- por aula: colar o link do video (o campo aceita URL completa e extrai o id
  sozinho — ninguem deve ter que achar o id na mao) e anexar materiais
- cada acao valida no servidor com `requireAdmin()` e revalida o portal do membro,
  **sem deploy**, igual ao painel de comunidade

**Membro — `/socio/comunidade/<espaco-de-aulas>`**
- em vez do feed, a trilha: modulos em acordeao, aulas em lista, marca de concluida
- aula travada aparece visivel mas fechada, dizendo quantas vendas faltam — travar
  escondendo nao vende; travar mostrando vende
- `/socio/comunidade/<espaco>/aula/<slug>`: player, descricao, materiais para baixar,
  botao "marcar como concluida", proxima aula
- barra de progresso do curso, alimentada por `lesson_progress`

## 7. Ordem de implementacao

1. Tabelas + funcoes de leitura/escrita em `src/lib/lessons.ts`
2. `storage.ts` aceitando material + rota `/materiais/[id]` com checagem
3. `/admin/aulas` completo (sem isso voce nao consegue cadastrar nada)
4. Trilha e pagina de aula do membro
5. Progresso e barra
6. Mobile: a trilha e o player no celular, com a barra de baixo que ja existe

Cada etapa e util sozinha. Depois da 3 voce ja consegue cadastrar o curso inteiro,
mesmo antes da tela do aluno estar pronta.

## 8. Pontos que dependem de decisao sua

- **Servico de video.** YouTube nao listado e gratis e aguenta qualquer volume,
  mas o video existe fora da plataforma e, com o link, abre sem login. Vimeo e Panda
  travam por dominio e custam mensalidade. Para conteudo pago, Panda ou Vimeo e o
  certo; para comecar sem custo, YouTube nao listado resolve.
- **Disco em 89%.** Mesmo sem video, vale limpar antes de abrir material para upload.
- **Concluir aula:** no clique do aluno (simples, honesto) ou automatico por tempo
  assistido (exige a API do player e so funciona em Vimeo/Panda).
