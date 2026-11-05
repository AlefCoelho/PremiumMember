import { db, getAffiliateSummaries } from "@/lib/db";

db.exec(`
CREATE TABLE IF NOT EXISTS community_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_spaces (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL REFERENCES community_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'posts',
  min_eligible_sales INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  space_id INTEGER NOT NULL REFERENCES community_spaces(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL DEFAULT 'member',
  author_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL DEFAULT 'member',
  author_id INTEGER NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  affiliate_id INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (post_id, affiliate_id)
);

CREATE TABLE IF NOT EXISTS community_favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  affiliate_id INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (post_id, affiliate_id)
);

CREATE TABLE IF NOT EXISTS community_post_images (
  post_id INTEGER PRIMARY KEY REFERENCES community_posts(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_featured_posts (
  post_id INTEGER PRIMARY KEY REFERENCES community_posts(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Apresentacao do espaco: emoji na lateral, capa e chamada na galeria de
-- cursos. Fica aqui, junto de community_spaces, porque community.ts consulta
-- esta tabela e os modulos carregam nesta ordem — se a criacao ficasse em
-- lessons.ts, a primeira consulta da lateral quebraria.
-- Tabela separada porque o projeto nunca usa ALTER TABLE.
CREATE TABLE IF NOT EXISTS space_presentation (
  space_id INTEGER PRIMARY KEY REFERENCES community_spaces(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL DEFAULT '',
  headline TEXT NOT NULL DEFAULT '',
  cover_path TEXT NOT NULL DEFAULT '',
  featured INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Regra de acesso de um grupo ou de um espaco. Duas coisas moram aqui porque
-- as duas respondem a mesma pergunta — "este membro pode abrir isto agora?" —
-- e precisam ser avaliadas juntas:
--
--   1. travamento premium: o conteudo existe, aparece na lateral e leva a um
--      link de pagamento em vez de abrir;
--   2. liberacao programada: data fixa (release_at) ou N dias depois da
--      entrada do membro (release_days), que e o gotejamento por turma.
--
-- A coluna scope guarda 'group' ou 'space' na mesma tabela, entao nao ha FK: a regra
-- de um alvo apagado fica orfa e inofensiva, e deleteSpace limpa a dele.
CREATE TABLE IF NOT EXISTS community_access_rules (
  scope TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  locked INTEGER NOT NULL DEFAULT 0,
  checkout_url TEXT NOT NULL DEFAULT '',
  price_label TEXT NOT NULL DEFAULT '',
  pitch TEXT NOT NULL DEFAULT '',
  release_at TEXT NOT NULL DEFAULT '',
  release_days INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (scope, target_id)
);

-- Quem pagou. O link de pagamento e externo, entao a liberacao e um ato do
-- admin: ele confere o pagamento e libera o membro aqui. Sem esta tabela o
-- travamento premium seria enfeite — ou todo mundo entra, ou ninguem entra.
CREATE TABLE IF NOT EXISTS space_grants (
  space_id INTEGER NOT NULL REFERENCES community_spaces(id) ON DELETE CASCADE,
  affiliate_id INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  note TEXT NOT NULL DEFAULT '',
  granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (space_id, affiliate_id)
);

CREATE INDEX IF NOT EXISTS idx_space_grants_member ON space_grants(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_community_reactions_post ON community_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_community_favorites_member ON community_favorites(affiliate_id, created_at);
CREATE INDEX IF NOT EXISTS idx_community_spaces_group ON community_spaces(group_id, position);
CREATE INDEX IF NOT EXISTS idx_community_posts_space ON community_posts(space_id, created_at);
CREATE INDEX IF NOT EXISTS idx_community_comments_post ON community_comments(post_id, created_at);
`);

export type CommunitySpace = {
  id: number;
  group_id: number;
  group_name: string;
  group_slug: string;
  name: string;
  slug: string;
  description: string;
  kind: string;
  min_eligible_sales: number;
  position: number;
  status: string;
  post_count: number;
  emoji?: string;
  // Preenchido so em getSpacesForMember. String e nao Date de proposito: a
  // lateral e componente de cliente, e texto pronto atravessa a fronteira sem
  // depender de como o Next serializa cada tipo.
  bloqueio?: { tipo: "premium" | "agenda"; texto: string } | null;
};

export type CommunityGroupWithSpaces = {
  id: number;
  name: string;
  slug: string;
  spaces: CommunitySpace[];
};

export type CommunityPost = {
  id: number;
  space_id: number;
  space_name: string;
  space_slug: string;
  author_type: string;
  author_id: number;
  author_name: string;
  title: string;
  body: string;
  pinned: number;
  created_at: string;
  comment_count: number;
};

export type CommunityComment = {
  id: number;
  post_id: number;
  author_type: string;
  author_id: number;
  author_name: string;
  body: string;
  created_at: string;
};

const defaultGroups = [
  {
    slug: "boas-vindas",
    name: "Boas-Vindas",
    position: 1,
    spaces: [
      {
        slug: "comece-por-aqui",
        name: "Comece por aqui",
        description: "Primeiros passos dentro do Premium Member.",
        kind: "posts",
        position: 1,
      },
      {
        slug: "apresente-se",
        name: "Apresente-se aqui",
        description: "Conte quem voce e e o que quer construir aqui dentro.",
        kind: "posts",
        position: 2,
      },
    ],
  },
  {
    slug: "suporte",
    name: "Chat e Suporte",
    position: 2,
    spaces: [
      {
        slug: "suporte-tecnico",
        name: "Suporte Tecnico",
        description: "Duvidas sobre painel, links, pagamentos e saques.",
        kind: "support",
        position: 1,
      },
      {
        slug: "bate-papo",
        name: "Bate-papo aberto",
        description: "Espaco livre para os membros conversarem entre si.",
        kind: "posts",
        position: 2,
      },
    ],
  },
  {
    slug: "aulas",
    name: "Aulas",
    position: 3,
    spaces: [
      {
        slug: "formacao-premium-member",
        name: "Formacao Premium Member",
        description: "Trilha base de como construir sua rede de indicacoes.",
        kind: "lessons",
        position: 1,
      },
    ],
  },
  {
    slug: "projetos",
    name: "Projetos",
    position: 4,
    spaces: [
      {
        slug: "copyshield-pro",
        name: "CopyShield Pro",
        description: "Estrategias, materiais e duvidas do CopyShield Pro.",
        kind: "posts",
        position: 1,
      },
      {
        slug: "tradeshield",
        name: "TradeShield",
        description: "Estrategias, materiais e duvidas do TradeShield.",
        kind: "posts",
        position: 2,
      },
    ],
  },
] as const;

const insertGroup = db.prepare(
  "INSERT OR IGNORE INTO community_groups (name, slug, position) VALUES (?, ?, ?)"
);
const findGroupBySlug = db.prepare("SELECT id FROM community_groups WHERE slug = ?");
const insertSpace = db.prepare(
  `INSERT OR IGNORE INTO community_spaces (group_id, name, slug, description, kind, position)
   VALUES (?, ?, ?, ?, ?, ?)`
);

for (const group of defaultGroups) {
  insertGroup.run(group.name, group.slug, group.position);
  const row = findGroupBySlug.get(group.slug) as { id: number } | undefined;
  if (!row) continue;
  for (const space of group.spaces) {
    insertSpace.run(row.id, space.name, space.slug, space.description, space.kind, space.position);
  }
}

/* Acesso: travamento premium e liberacao programada ------------------------- */

export type AccessScope = "group" | "space";

export type AccessRule = {
  scope: AccessScope;
  target_id: number;
  locked: number;
  checkout_url: string;
  price_label: string;
  pitch: string;
  release_at: string;
  release_days: number;
};

const emptyRule = (scope: AccessScope, targetId: number): AccessRule => ({
  scope,
  target_id: targetId,
  locked: 0,
  checkout_url: "",
  price_label: "",
  pitch: "",
  release_at: "",
  release_days: 0,
});

const ruleColumns =
  "scope, target_id, locked, checkout_url, price_label, pitch, release_at, release_days";

export function getAccessRule(scope: AccessScope, targetId: number): AccessRule {
  const row = db
    .prepare(`SELECT ${ruleColumns} FROM community_access_rules WHERE scope = ? AND target_id = ?`)
    .get(scope, targetId) as AccessRule | undefined;
  return row ?? emptyRule(scope, targetId);
}

export function getAccessRuleMap(scope: AccessScope): Map<number, AccessRule> {
  const rows = db
    .prepare(`SELECT ${ruleColumns} FROM community_access_rules WHERE scope = ?`)
    .all(scope) as AccessRule[];
  return new Map(rows.map((row) => [row.target_id, row]));
}

export function setAccessRule(
  scope: AccessScope,
  targetId: number,
  input: {
    locked: boolean;
    checkoutUrl: string;
    priceLabel: string;
    pitch: string;
    releaseAt: string;
    releaseDays: number;
  }
) {
  db.prepare(
    `INSERT INTO community_access_rules
       (scope, target_id, locked, checkout_url, price_label, pitch, release_at, release_days, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT (scope, target_id) DO UPDATE SET
       locked = excluded.locked,
       checkout_url = excluded.checkout_url,
       price_label = excluded.price_label,
       pitch = excluded.pitch,
       release_at = excluded.release_at,
       release_days = excluded.release_days,
       updated_at = CURRENT_TIMESTAMP`
  ).run(
    scope,
    targetId,
    input.locked ? 1 : 0,
    input.checkoutUrl,
    input.priceLabel,
    input.pitch,
    input.releaseAt,
    Math.max(0, Math.floor(input.releaseDays))
  );
}

export function grantSpaceAccess(spaceId: number, affiliateId: number, note = "") {
  db.prepare(
    `INSERT INTO space_grants (space_id, affiliate_id, note) VALUES (?, ?, ?)
     ON CONFLICT (space_id, affiliate_id) DO UPDATE SET note = excluded.note`
  ).run(spaceId, affiliateId, note.slice(0, 160));
}

export function revokeSpaceAccess(spaceId: number, affiliateId: number) {
  db.prepare("DELETE FROM space_grants WHERE space_id = ? AND affiliate_id = ?").run(
    spaceId,
    affiliateId
  );
}

export function getSpaceGrants(spaceId: number) {
  return db
    .prepare(
      `SELECT space_grants.affiliate_id, space_grants.note, space_grants.granted_at,
              affiliates.name, affiliates.email
         FROM space_grants
         JOIN affiliates ON affiliates.id = space_grants.affiliate_id
        WHERE space_grants.space_id = ?
        ORDER BY space_grants.granted_at DESC`
    )
    .all(spaceId) as {
    affiliate_id: number;
    note: string;
    granted_at: string;
    name: string;
    email: string;
  }[];
}

export function getGrantedSpaceIds(affiliateId: number): Set<number> {
  const rows = db
    .prepare("SELECT space_id FROM space_grants WHERE affiliate_id = ?")
    .all(affiliateId) as { space_id: number }[];
  return new Set(rows.map((row) => row.space_id));
}

/**
 * Quando a regra libera, em data absoluta.
 *
 * `release_at` e uma data que o admin escreveu; `release_days` conta a partir
 * da entrada do membro, entao cada um tem a sua propria data. Com as duas
 * preenchidas vale a mais tarde: quem definiu as duas quis as duas condicoes.
 */
function releaseMomentFor(rule: AccessRule, joinedAt: string | null) {
  const momentos: number[] = [];

  if (rule.release_at) {
    const fixa = new Date(`${rule.release_at.replace(" ", "T")}:00`);
    if (!Number.isNaN(fixa.getTime())) momentos.push(fixa.getTime());
  }

  if (rule.release_days > 0 && joinedAt) {
    const entrada = new Date(`${joinedAt.replace(" ", "T")}Z`);
    if (!Number.isNaN(entrada.getTime())) {
      momentos.push(entrada.getTime() + rule.release_days * 24 * 60 * 60 * 1000);
    }
  }

  if (!momentos.length) return null;
  return new Date(Math.max(...momentos));
}

export type SpaceAccess =
  | { ok: true }
  | { ok: false; motivo: "vendas"; faltam: number; exigido: number }
  | { ok: false; motivo: "premium"; checkoutUrl: string; priceLabel: string; pitch: string }
  | { ok: false; motivo: "agenda"; liberaEm: Date };

/**
 * A regra de acesso de um espaco num lugar so, para a lateral, a pagina do
 * espaco e a acao de publicar darem sempre a mesma resposta.
 *
 * A ordem importa: vendas primeiro (e o criterio que o membro resolve
 * indicando), depois agenda, depois pagamento. Quem ja foi liberado pelo admin
 * passa direto pelos dois ultimos — ele pagou, nao faz sentido continuar
 * esperando a data da turma dele.
 */
export function evaluateSpaceAccess(input: {
  spaceId: number;
  groupId: number;
  minEligibleSales: number;
  eligibleSales: number;
  joinedAt: string | null;
  granted: boolean;
  spaceRule?: AccessRule;
  groupRule?: AccessRule;
  agora?: Date;
}): SpaceAccess {
  if (input.minEligibleSales > input.eligibleSales) {
    return {
      ok: false,
      motivo: "vendas",
      exigido: input.minEligibleSales,
      faltam: input.minEligibleSales - input.eligibleSales,
    };
  }

  if (input.granted) return { ok: true };

  const agora = input.agora ?? new Date();
  const regras = [
    input.groupRule ?? getAccessRule("group", input.groupId),
    input.spaceRule ?? getAccessRule("space", input.spaceId),
  ];

  // A data mais distante entre grupo e espaco e a que vale: se o grupo abre em
  // marco, um espaco dentro dele nao pode abrir em janeiro.
  let liberaEm: Date | null = null;
  for (const regra of regras) {
    const momento = releaseMomentFor(regra, input.joinedAt);
    if (momento && momento.getTime() > agora.getTime()) {
      if (!liberaEm || momento.getTime() > liberaEm.getTime()) liberaEm = momento;
    }
  }
  if (liberaEm) return { ok: false, motivo: "agenda", liberaEm };

  // Travamento do espaco ganha do grupo so por ser mais especifico; o texto e o
  // link mostrados sao os da regra que travou.
  const travada = regras.reverse().find((regra) => regra.locked === 1);
  if (travada) {
    return {
      ok: false,
      motivo: "premium",
      checkoutUrl: travada.checkout_url,
      priceLabel: travada.price_label,
      pitch: travada.pitch,
    };
  }

  return { ok: true };
}

export function getMemberEligibleSales(affiliateId: number) {
  const affiliate = getAffiliateSummaries().find((item) => item.id === affiliateId);
  return affiliate?.eligible_referrals ?? 0;
}

export function formatReleaseMoment(data: Date) {
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Espacos que o membro ve na lateral.
 *
 * Travado por venda continua saindo da lista: e um espaco que ele nem deveria
 * saber que existe. Travado por pagamento ou por data FICA na lista, marcado —
 * ninguem compra o que nao viu, e ninguem espera por uma data que nao conhece.
 */
export function getSpacesForMember(eligibleSales: number, affiliateId?: number): CommunitySpace[] {
  const espacos = db
    .prepare(
      `SELECT community_spaces.*,
              community_groups.name AS group_name,
              community_groups.slug AS group_slug,
              COALESCE(space_presentation.emoji, '') AS emoji,
              (
                SELECT COUNT(*) FROM community_posts
                WHERE community_posts.space_id = community_spaces.id
                  AND community_posts.status = 'published'
              ) AS post_count
       FROM community_spaces
       JOIN community_groups ON community_groups.id = community_spaces.group_id
       LEFT JOIN space_presentation ON space_presentation.space_id = community_spaces.id
       WHERE community_spaces.status = 'active'
         AND community_groups.status = 'active'
         AND community_spaces.min_eligible_sales <= ?
       ORDER BY community_groups.position, community_groups.id,
                community_spaces.position, community_spaces.id`
    )
    .all(eligibleSales) as CommunitySpace[];

  if (!affiliateId) return espacos;

  const joinedAt = getAffiliateJoinDate(affiliateId);
  const granted = getGrantedSpaceIds(affiliateId);
  const regrasEspaco = getAccessRuleMap("space");
  const regrasGrupo = getAccessRuleMap("group");
  const agora = new Date();

  return espacos.map((espaco) => {
    const acesso = evaluateSpaceAccess({
      spaceId: espaco.id,
      groupId: espaco.group_id,
      minEligibleSales: espaco.min_eligible_sales,
      eligibleSales,
      joinedAt,
      granted: granted.has(espaco.id),
      spaceRule: regrasEspaco.get(espaco.id) ?? emptyRule("space", espaco.id),
      groupRule: regrasGrupo.get(espaco.group_id) ?? emptyRule("group", espaco.group_id),
      agora,
    });

    if (acesso.ok) return { ...espaco, bloqueio: null };
    if (acesso.motivo === "premium") {
      return {
        ...espaco,
        bloqueio: { tipo: "premium" as const, texto: acesso.priceLabel || "Premium" },
      };
    }
    if (acesso.motivo === "agenda") {
      return {
        ...espaco,
        bloqueio: { tipo: "agenda" as const, texto: formatReleaseMoment(acesso.liberaEm) },
      };
    }
    return { ...espaco, bloqueio: null };
  });
}

export function getAffiliateJoinDate(affiliateId: number) {
  const row = db.prepare("SELECT created_at FROM affiliates WHERE id = ?").get(affiliateId) as
    | { created_at: string }
    | undefined;
  return row?.created_at ?? null;
}

export function groupSpaces(spaces: CommunitySpace[]): CommunityGroupWithSpaces[] {
  const groups = new Map<number, CommunityGroupWithSpaces>();
  for (const space of spaces) {
    const current = groups.get(space.group_id);
    if (current) {
      current.spaces.push(space);
      continue;
    }
    groups.set(space.group_id, {
      id: space.group_id,
      name: space.group_name,
      slug: space.group_slug,
      spaces: [space],
    });
  }
  return [...groups.values()];
}

export function getSpaceBySlug(slug: string) {
  return db
    .prepare(
      `SELECT community_spaces.*,
              community_groups.name AS group_name,
              community_groups.slug AS group_slug,
              0 AS post_count
       FROM community_spaces
       JOIN community_groups ON community_groups.id = community_spaces.group_id
       WHERE community_spaces.slug = ? AND community_spaces.status = 'active'`
    )
    .get(slug) as CommunitySpace | undefined;
}

const postSelect = `
  SELECT community_posts.id,
         community_posts.space_id,
         community_spaces.name AS space_name,
         community_spaces.slug AS space_slug,
         community_posts.author_type,
         community_posts.author_id,
         CASE community_posts.author_type
           WHEN 'admin' THEN 'Premium Member'
           ELSE COALESCE(affiliates.name, 'Membro removido')
         END AS author_name,
         community_posts.title,
         community_posts.body,
         community_posts.pinned,
         community_posts.created_at,
         (
           SELECT COUNT(*) FROM community_comments
           WHERE community_comments.post_id = community_posts.id
             AND community_comments.status = 'published'
         ) AS comment_count
  FROM community_posts
  JOIN community_spaces ON community_spaces.id = community_posts.space_id
  LEFT JOIN affiliates
    ON affiliates.id = community_posts.author_id
   AND community_posts.author_type = 'member'
`;

export function getFeedPosts(eligibleSales: number, limit = 40): CommunityPost[] {
  return db
    .prepare(
      `${postSelect}
       WHERE community_posts.status = 'published'
         AND community_spaces.status = 'active'
         AND community_spaces.min_eligible_sales <= ?
       ORDER BY community_posts.pinned DESC, community_posts.created_at DESC, community_posts.id DESC
       LIMIT ?`
    )
    .all(eligibleSales, limit) as CommunityPost[];
}

export function getSpacePosts(spaceId: number, limit = 40): CommunityPost[] {
  return db
    .prepare(
      `${postSelect}
       WHERE community_posts.status = 'published'
         AND community_posts.space_id = ?
       ORDER BY community_posts.pinned DESC, community_posts.created_at DESC, community_posts.id DESC
       LIMIT ?`
    )
    .all(spaceId, limit) as CommunityPost[];
}

export function getPostById(postId: number): CommunityPost | undefined {
  return db
    .prepare(`${postSelect} WHERE community_posts.id = ? AND community_posts.status = 'published'`)
    .get(postId) as CommunityPost | undefined;
}

export function getPostComments(postId: number): CommunityComment[] {
  return db
    .prepare(
      `SELECT community_comments.id,
              community_comments.post_id,
              community_comments.author_type,
              community_comments.author_id,
              CASE community_comments.author_type
                WHEN 'admin' THEN 'Premium Member'
                ELSE COALESCE(affiliates.name, 'Membro removido')
              END AS author_name,
              community_comments.body,
              community_comments.created_at
       FROM community_comments
       LEFT JOIN affiliates
         ON affiliates.id = community_comments.author_id
        AND community_comments.author_type = 'member'
       WHERE community_comments.post_id = ?
         AND community_comments.status = 'published'
       ORDER BY community_comments.created_at, community_comments.id`
    )
    .all(postId) as CommunityComment[];
}

export function createPost(input: {
  spaceId: number;
  authorType: "member" | "admin";
  authorId: number;
  title: string;
  body: string;
}) {
  const result = db
    .prepare(
      `INSERT INTO community_posts (space_id, author_type, author_id, title, body)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(input.spaceId, input.authorType, input.authorId, input.title, input.body);
  return Number(result.lastInsertRowid);
}

export function createComment(input: {
  postId: number;
  authorType: "member" | "admin";
  authorId: number;
  body: string;
}) {
  const result = db
    .prepare(
      `INSERT INTO community_comments (post_id, author_type, author_id, body)
       VALUES (?, ?, ?, ?)`
    )
    .run(input.postId, input.authorType, input.authorId, input.body);
  return Number(result.lastInsertRowid);
}

export function getCommunityPortalData(affiliateId: number) {
  const eligibleSales = getMemberEligibleSales(affiliateId);
  const spaces = getSpacesForMember(eligibleSales, affiliateId);
  return {
    eligibleSales,
    spaces,
    groups: groupSpaces(spaces),
  };
}

export const spaceKinds = [
  { value: "posts", label: "Publicacoes" },
  { value: "support", label: "Suporte" },
  { value: "lessons", label: "Aulas" },
] as const;

export type SpaceKind = (typeof spaceKinds)[number]["value"];

export function isSpaceKind(value: string): value is SpaceKind {
  return spaceKinds.some((kind) => kind.value === value);
}

export type AdminCommunitySpace = {
  id: number;
  group_id: number;
  name: string;
  slug: string;
  description: string;
  kind: string;
  min_eligible_sales: number;
  position: number;
  status: string;
  post_count: number;
  emoji?: string;
  rule: AccessRule;
  grant_count: number;
};

export type AdminCommunityGroup = {
  id: number;
  name: string;
  slug: string;
  position: number;
  status: string;
  spaces: AdminCommunitySpace[];
  rule: AccessRule;
};

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Rotas estaticas de /socio/comunidade. Um espaco com um destes slugs ficaria
// invisivel: o Next atende o segmento fixo e nunca chega no [space].
const reservedSlugs = new Set([
  "cursos",
  "eventos",
  "membros",
  "favoritos",
  "notificacoes",
  "perfil",
  "aula",
]);

function createUniqueSlug(table: "community_groups" | "community_spaces", name: string, fallback: string) {
  const bruto = slugify(name) || fallback;
  const base = reservedSlugs.has(bruto) ? `${bruto}-espaco` : bruto;
  const exists = db.prepare(`SELECT id FROM ${table} WHERE slug = ?`);
  if (!exists.get(base)) return base;
  for (let attempt = 2; attempt < 200; attempt += 1) {
    const candidate = `${base.slice(0, 54)}-${attempt}`;
    if (!exists.get(candidate)) return candidate;
  }
  return `${base.slice(0, 48)}-${Date.now().toString(36).slice(-6)}`;
}

export function getAdminCommunityTree(): AdminCommunityGroup[] {
  const groups = db
    .prepare(
      `SELECT id, name, slug, position, status
       FROM community_groups
       ORDER BY position, id`
    )
    .all() as Omit<AdminCommunityGroup, "spaces">[];

  const spaces = db
    .prepare(
      `SELECT community_spaces.id,
              community_spaces.group_id,
              community_spaces.name,
              community_spaces.slug,
              community_spaces.description,
              community_spaces.kind,
              community_spaces.min_eligible_sales,
              community_spaces.position,
              community_spaces.status,
              COALESCE(space_presentation.emoji, '') AS emoji,
              (
                SELECT COUNT(*) FROM community_posts
                WHERE community_posts.space_id = community_spaces.id
              ) AS post_count,
              (
                SELECT COUNT(*) FROM space_grants
                WHERE space_grants.space_id = community_spaces.id
              ) AS grant_count
       FROM community_spaces
       LEFT JOIN space_presentation ON space_presentation.space_id = community_spaces.id
       ORDER BY community_spaces.position, community_spaces.id`
    )
    .all() as AdminCommunitySpace[];

  const regrasEspaco = getAccessRuleMap("space");
  const regrasGrupo = getAccessRuleMap("group");

  return groups.map((group) => ({
    ...group,
    rule: regrasGrupo.get(group.id) ?? emptyRule("group", group.id),
    spaces: spaces
      .filter((space) => space.group_id === group.id)
      .map((space) => ({
        ...space,
        rule: regrasEspaco.get(space.id) ?? emptyRule("space", space.id),
      })),
  }));
}

export function getGroupById(groupId: number) {
  return db.prepare("SELECT * FROM community_groups WHERE id = ?").get(groupId) as
    | { id: number; name: string; slug: string; position: number; status: string }
    | undefined;
}

export function getSpaceById(spaceId: number) {
  return db.prepare("SELECT * FROM community_spaces WHERE id = ?").get(spaceId) as
    | Omit<AdminCommunitySpace, "post_count">
    | undefined;
}

function nextPosition(table: "community_groups" | "community_spaces", groupId?: number) {
  const row = (
    groupId
      ? db.prepare(`SELECT MAX(position) AS max FROM ${table} WHERE group_id = ?`).get(groupId)
      : db.prepare(`SELECT MAX(position) AS max FROM ${table}`).get()
  ) as { max: number | null };
  return (row.max ?? 0) + 1;
}

export function createGroup(input: { name: string }) {
  const slug = createUniqueSlug("community_groups", input.name, "grupo");
  const result = db
    .prepare("INSERT INTO community_groups (name, slug, position) VALUES (?, ?, ?)")
    .run(input.name, slug, nextPosition("community_groups"));
  return Number(result.lastInsertRowid);
}

export function renameGroup(groupId: number, name: string) {
  db.prepare("UPDATE community_groups SET name = ? WHERE id = ?").run(name, groupId);
}

export function setGroupStatus(groupId: number, status: "active" | "archived") {
  db.prepare("UPDATE community_groups SET status = ? WHERE id = ?").run(status, groupId);
}

export function createSpace(input: {
  groupId: number;
  name: string;
  description: string;
  kind: SpaceKind;
  minEligibleSales: number;
}) {
  const slug = createUniqueSlug("community_spaces", input.name, "espaco");
  const result = db
    .prepare(
      `INSERT INTO community_spaces (group_id, name, slug, description, kind, min_eligible_sales, position)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.groupId,
      input.name,
      slug,
      input.description,
      input.kind,
      input.minEligibleSales,
      nextPosition("community_spaces", input.groupId)
    );
  return { id: Number(result.lastInsertRowid), slug };
}

// O slug nunca e atualizado aqui: URLs ja publicadas do portal do membro dependem dele.
export function updateSpace(
  spaceId: number,
  input: {
    groupId: number;
    name: string;
    description: string;
    kind: SpaceKind;
    minEligibleSales: number;
  }
) {
  const current = getSpaceById(spaceId);
  if (!current) throw new Error("Espaco nao encontrado.");
  const position =
    current.group_id === input.groupId
      ? current.position
      : nextPosition("community_spaces", input.groupId);

  db.prepare(
    `UPDATE community_spaces
     SET group_id = ?, name = ?, description = ?, kind = ?, min_eligible_sales = ?, position = ?
     WHERE id = ?`
  ).run(
    input.groupId,
    input.name,
    input.description,
    input.kind,
    input.minEligibleSales,
    position,
    spaceId
  );
}

export function setSpaceStatus(spaceId: number, status: "active" | "archived") {
  db.prepare("UPDATE community_spaces SET status = ? WHERE id = ?").run(status, spaceId);
}

// ON DELETE CASCADE leva posts e comentarios do espaco junto. A regra de acesso
// nao tem FK (a tabela e compartilhada com grupos), entao sai na mao: deixada
// para tras, ela voltaria a valer se o SQLite reaproveitasse o id.
export function deleteSpace(spaceId: number) {
  const apagar = db.transaction(() => {
    db.prepare("DELETE FROM community_access_rules WHERE scope = 'space' AND target_id = ?").run(
      spaceId
    );
    db.prepare("DELETE FROM community_spaces WHERE id = ?").run(spaceId);
  });
  apagar();
}

function swapPositions(
  table: "community_groups" | "community_spaces",
  rows: { id: number; position: number }[],
  id: number,
  direction: "up" | "down"
) {
  const index = rows.findIndex((row) => row.id === id);
  if (index < 0) return;
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= rows.length) return;

  const update = db.prepare(`UPDATE ${table} SET position = ? WHERE id = ?`);
  const reorder = db.transaction(() => {
    // Normaliza as posicoes antes de trocar: a semente inicial pode ter empates.
    rows.forEach((row, order) => update.run(order + 1, row.id));
    update.run(targetIndex + 1, rows[index].id);
    update.run(index + 1, rows[targetIndex].id);
  });
  reorder();
}

export function moveGroup(groupId: number, direction: "up" | "down") {
  const rows = db
    .prepare("SELECT id, position FROM community_groups ORDER BY position, id")
    .all() as { id: number; position: number }[];
  swapPositions("community_groups", rows, groupId, direction);
}

/**
 * Manda o grupo direto para a posicao N.
 *
 * As setas existem, mas mover o ultimo grupo para o topo exige clicar varias
 * vezes e esperar um redirect inteiro a cada clique — e a posicao escolhida
 * num campo resolve em um envio. Tambem normaliza as posicoes: a semente
 * inicial pode ter empates, e com empate a ordem depende do id.
 */
export function setGroupPosition(groupId: number, position: number) {
  const rows = db
    .prepare("SELECT id FROM community_groups ORDER BY position, id")
    .all() as { id: number }[];

  const atual = rows.findIndex((row) => row.id === groupId);
  if (atual < 0) return;

  const destino = Math.min(Math.max(Math.floor(position), 1), rows.length) - 1;
  const ordem = rows.map((row) => row.id);
  ordem.splice(destino, 0, ordem.splice(atual, 1)[0]);

  const update = db.prepare("UPDATE community_groups SET position = ? WHERE id = ?");
  const reordenar = db.transaction(() => {
    ordem.forEach((id, index) => update.run(index + 1, id));
  });
  reordenar();
}

export function moveSpace(spaceId: number, direction: "up" | "down") {
  const space = getSpaceById(spaceId);
  if (!space) return;
  const rows = db
    .prepare("SELECT id, position FROM community_spaces WHERE group_id = ? ORDER BY position, id")
    .all(space.group_id) as { id: number; position: number }[];
  swapPositions("community_spaces", rows, spaceId, direction);
}

export const reactionKinds = [
  { value: "like", label: "Curtir", emoji: "\u{1F44D}" },
  { value: "dislike", label: "Nao curtir", emoji: "\u{1F44E}" },
  { value: "heart", label: "Amei", emoji: "\u2764\uFE0F" },
  { value: "money", label: "Lucrativo", emoji: "\u{1F911}" },
  { value: "sad", label: "Triste", emoji: "\u{1F622}" },
] as const;

export type ReactionKind = (typeof reactionKinds)[number]["value"];

export function isReactionKind(value: string): value is ReactionKind {
  return reactionKinds.some((kind) => kind.value === value);
}

export type PostMeta = {
  reactions: Record<string, number>;
  reaction_total: number;
  my_reaction: string | null;
  favorited: boolean;
};

export type CommunityPostWithMeta = CommunityPost & PostMeta;

// Uma reacao por membro por publicacao: clicar em outra troca, clicar na mesma
// remove. E o comportamento que as pessoas ja esperam de um feed.
export function setReaction(postId: number, affiliateId: number, kind: ReactionKind) {
  const current = db
    .prepare("SELECT kind FROM community_reactions WHERE post_id = ? AND affiliate_id = ?")
    .get(postId, affiliateId) as { kind: string } | undefined;

  if (current?.kind === kind) {
    db.prepare("DELETE FROM community_reactions WHERE post_id = ? AND affiliate_id = ?").run(
      postId,
      affiliateId
    );
    return null;
  }

  db.prepare(
    `INSERT INTO community_reactions (post_id, affiliate_id, kind)
     VALUES (?, ?, ?)
     ON CONFLICT (post_id, affiliate_id) DO UPDATE SET kind = excluded.kind`
  ).run(postId, affiliateId, kind);
  return kind;
}

export function toggleFavorite(postId: number, affiliateId: number) {
  const existing = db
    .prepare("SELECT id FROM community_favorites WHERE post_id = ? AND affiliate_id = ?")
    .get(postId, affiliateId) as { id: number } | undefined;

  if (existing) {
    db.prepare("DELETE FROM community_favorites WHERE id = ?").run(existing.id);
    return false;
  }

  db.prepare("INSERT INTO community_favorites (post_id, affiliate_id) VALUES (?, ?)").run(
    postId,
    affiliateId
  );
  return true;
}

// Duas consultas agregadas para a lista inteira, em vez de duas por publicacao.
export function attachPostMeta(posts: CommunityPost[], affiliateId: number): CommunityPostWithMeta[] {
  if (!posts.length) return [];
  const ids = posts.map((post) => post.id);
  const placeholders = ids.map(() => "?").join(",");

  const counts = db
    .prepare(
      `SELECT post_id, kind, COUNT(*) AS total
       FROM community_reactions
       WHERE post_id IN (${placeholders})
       GROUP BY post_id, kind`
    )
    .all(...ids) as { post_id: number; kind: string; total: number }[];

  const mine = db
    .prepare(
      `SELECT post_id, kind FROM community_reactions
       WHERE affiliate_id = ? AND post_id IN (${placeholders})`
    )
    .all(affiliateId, ...ids) as { post_id: number; kind: string }[];

  const favorites = db
    .prepare(
      `SELECT post_id FROM community_favorites
       WHERE affiliate_id = ? AND post_id IN (${placeholders})`
    )
    .all(affiliateId, ...ids) as { post_id: number }[];

  const myMap = new Map(mine.map((row) => [row.post_id, row.kind]));
  const favSet = new Set(favorites.map((row) => row.post_id));

  return posts.map((post) => {
    const reactions: Record<string, number> = {};
    let total = 0;
    for (const row of counts) {
      if (row.post_id !== post.id) continue;
      reactions[row.kind] = row.total;
      total += row.total;
    }
    return {
      ...post,
      reactions,
      reaction_total: total,
      my_reaction: myMap.get(post.id) ?? null,
      favorited: favSet.has(post.id),
    };
  });
}

export function getFavoritePosts(affiliateId: number, eligibleSales: number): CommunityPost[] {
  return db
    .prepare(
      `${postSelect}
       JOIN community_favorites
         ON community_favorites.post_id = community_posts.id
        AND community_favorites.affiliate_id = ?
       WHERE community_posts.status = 'published'
         AND community_spaces.status = 'active'
         AND community_spaces.min_eligible_sales <= ?
       ORDER BY community_favorites.created_at DESC`
    )
    .all(affiliateId, eligibleSales) as CommunityPost[];
}

// Link externo de membro e bloqueado. O admin posta link, o membro nao: e a
// regra combinada para a comunidade nao virar vitrine de divulgacao.
const linkPattern = /(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|br|io|me|co|app|link|gg|tv|ly)\b)/i;

export function containsExternalLink(text: string) {
  return linkPattern.test(text);
}

export function toggleFeatured(postId: number) {
  const existing = db
    .prepare("SELECT post_id FROM community_featured_posts WHERE post_id = ?")
    .get(postId) as { post_id: number } | undefined;

  if (existing) {
    db.prepare("DELETE FROM community_featured_posts WHERE post_id = ?").run(postId);
    return false;
  }

  db.prepare("INSERT INTO community_featured_posts (post_id) VALUES (?)").run(postId);
  return true;
}

export function isFeatured(postId: number) {
  return Boolean(
    db.prepare("SELECT post_id FROM community_featured_posts WHERE post_id = ?").get(postId)
  );
}

export type TrendingPost = CommunityPost & { reaction_total: number; featured: boolean };

// Publicacoes em alta: primeiro o que o admin marcou como destaque, depois as
// mais reagidas. Respeita o acesso do membro, como o resto do feed.
export function getTrendingPosts(eligibleSales: number, limit = 5): TrendingPost[] {
  return db
    .prepare(
      `${postSelect}
       LEFT JOIN community_featured_posts
         ON community_featured_posts.post_id = community_posts.id
       WHERE community_posts.status = 'published'
         AND community_spaces.status = 'active'
         AND community_spaces.min_eligible_sales <= ?
       ORDER BY (community_featured_posts.post_id IS NOT NULL) DESC,
                (
                  SELECT COUNT(*) FROM community_reactions
                  WHERE community_reactions.post_id = community_posts.id
                ) DESC,
                community_posts.created_at DESC
       LIMIT ?`
    )
    .all(eligibleSales, limit)
    .map((row) => {
      const post = row as CommunityPost;
      return {
        ...post,
        reaction_total: (
          db
            .prepare("SELECT COUNT(*) AS total FROM community_reactions WHERE post_id = ?")
            .get(post.id) as { total: number }
        ).total,
        featured: isFeatured(post.id),
      };
    });
}

export function getRecentPostsForAdmin(limit = 40): (CommunityPost & { featured: boolean })[] {
  return db
    .prepare(
      `${postSelect}
       WHERE community_posts.status = 'published'
       ORDER BY community_posts.created_at DESC
       LIMIT ?`
    )
    .all(limit)
    .map((row) => {
      const post = row as CommunityPost;
      return { ...post, featured: isFeatured(post.id) };
    });
}

export function setPostImage(postId: number, storedPath: string) {
  db.prepare(
    `INSERT INTO community_post_images (post_id, image_path)
     VALUES (?, ?)
     ON CONFLICT (post_id) DO UPDATE SET image_path = excluded.image_path`
  ).run(postId, storedPath);
}

export function getPostImagePaths(postIds: number[]) {
  const unique = [...new Set(postIds)];
  if (!unique.length) return new Map<number, string>();
  const rows = db
    .prepare(
      `SELECT post_id, image_path FROM community_post_images
       WHERE post_id IN (${unique.map(() => "?").join(",")})`
    )
    .all(...unique) as { post_id: number; image_path: string }[];
  return new Map(rows.map((row) => [row.post_id, row.image_path]));
}
