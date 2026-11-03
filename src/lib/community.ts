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

export function getMemberEligibleSales(affiliateId: number) {
  const affiliate = getAffiliateSummaries().find((item) => item.id === affiliateId);
  return affiliate?.eligible_referrals ?? 0;
}

export function getSpacesForMember(eligibleSales: number): CommunitySpace[] {
  return db
    .prepare(
      `SELECT community_spaces.*,
              community_groups.name AS group_name,
              community_groups.slug AS group_slug,
              (
                SELECT COUNT(*) FROM community_posts
                WHERE community_posts.space_id = community_spaces.id
                  AND community_posts.status = 'published'
              ) AS post_count
       FROM community_spaces
       JOIN community_groups ON community_groups.id = community_spaces.group_id
       WHERE community_spaces.status = 'active'
         AND community_groups.status = 'active'
         AND community_spaces.min_eligible_sales <= ?
       ORDER BY community_groups.position, community_groups.id,
                community_spaces.position, community_spaces.id`
    )
    .all(eligibleSales) as CommunitySpace[];
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
  db.prepare(
    `INSERT INTO community_comments (post_id, author_type, author_id, body)
     VALUES (?, ?, ?, ?)`
  ).run(input.postId, input.authorType, input.authorId, input.body);
}

export function getCommunityPortalData(affiliateId: number) {
  const eligibleSales = getMemberEligibleSales(affiliateId);
  const spaces = getSpacesForMember(eligibleSales);
  return {
    eligibleSales,
    spaces,
    groups: groupSpaces(spaces),
  };
}
