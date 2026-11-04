import { db } from "@/lib/db";

// Notificacao da comunidade. Existe porque sem ela ninguem fica sabendo que
// recebeu comentario ou reacao: a pessoa so descobre se voltar na propria
// publicacao por acaso.
//
// Tabela nova e separada, como todas as da comunidade: nenhuma tabela do motor
// de comissao e tocada, e o rollback e so voltar o codigo.
//
// comment_id usa 0 em vez de NULL quando nao se aplica. E de proposito: no
// SQLite, dois NULLs nao colidem numa UNIQUE, entao com NULL a reacao criaria
// uma linha nova a cada clique. Com 0, a UNIQUE segura e um ator que fica
// trocando de reacao atualiza a mesma linha em vez de encher o sino.
db.exec(`
CREATE TABLE IF NOT EXISTS community_notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  affiliate_id INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  comment_id INTEGER NOT NULL DEFAULT 0,
  actor_type TEXT NOT NULL DEFAULT 'member',
  actor_id INTEGER NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (affiliate_id, kind, post_id, comment_id, actor_type, actor_id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_member
  ON community_notifications(affiliate_id, read_at, created_at);
`);

export type NotificationKind = "comment" | "reaction";

export type CommunityNotification = {
  id: number;
  kind: string;
  post_id: number;
  comment_id: number;
  actor_type: string;
  actor_id: number;
  actor_name: string;
  detail: string;
  read_at: string | null;
  created_at: string;
  post_title: string;
  space_slug: string;
};

// O autor de uma publicacao pode ser admin, e admin nao tem linha em affiliates.
// Por isso a notificacao so e criada quando o destinatario e membro.
function postOwnerIfMember(postId: number) {
  const row = db
    .prepare(
      `SELECT author_type, author_id FROM community_posts
       WHERE id = ? AND status = 'published'`
    )
    .get(postId) as { author_type: string; author_id: number } | undefined;

  if (!row || row.author_type !== "member") return null;
  return row.author_id;
}

function insert(input: {
  affiliateId: number;
  kind: NotificationKind;
  postId: number;
  commentId?: number;
  actorType: "member" | "admin";
  actorId: number;
  detail?: string;
}) {
  // Na colisao da UNIQUE, atualiza em vez de duplicar, e volta a ficar nao lida:
  // uma reacao trocada e novidade, mesmo que a linha ja exista.
  db.prepare(
    `INSERT INTO community_notifications
       (affiliate_id, kind, post_id, comment_id, actor_type, actor_id, detail)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (affiliate_id, kind, post_id, comment_id, actor_type, actor_id)
     DO UPDATE SET detail = excluded.detail,
                   read_at = NULL,
                   created_at = CURRENT_TIMESTAMP`
  ).run(
    input.affiliateId,
    input.kind,
    input.postId,
    input.commentId ?? 0,
    input.actorType,
    input.actorId,
    input.detail ?? ""
  );
}

export function notifyComment(input: {
  postId: number;
  commentId: number;
  actorType: "member" | "admin";
  actorId: number;
}) {
  const owner = postOwnerIfMember(input.postId);
  if (owner === null) return;
  // Ninguem precisa ser avisado de que comentou na propria publicacao.
  if (input.actorType === "member" && owner === input.actorId) return;

  insert({
    affiliateId: owner,
    kind: "comment",
    postId: input.postId,
    commentId: input.commentId,
    actorType: input.actorType,
    actorId: input.actorId,
  });
}

export function notifyReaction(input: {
  postId: number;
  actorType: "member" | "admin";
  actorId: number;
  kind: string;
}) {
  const owner = postOwnerIfMember(input.postId);
  if (owner === null) return;
  if (input.actorType === "member" && owner === input.actorId) return;

  insert({
    affiliateId: owner,
    kind: "reaction",
    postId: input.postId,
    actorType: input.actorType,
    actorId: input.actorId,
    detail: input.kind,
  });
}

// Reacao retirada deixa de ser novidade: a linha sai, e o sino nao fica
// apontando para algo que nao existe mais.
export function clearReactionNotification(input: {
  postId: number;
  actorType: "member" | "admin";
  actorId: number;
}) {
  db.prepare(
    `DELETE FROM community_notifications
     WHERE kind = 'reaction' AND post_id = ? AND actor_type = ? AND actor_id = ?`
  ).run(input.postId, input.actorType, input.actorId);
}

export function countUnread(affiliateId: number) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS total FROM community_notifications
       WHERE affiliate_id = ? AND read_at IS NULL`
    )
    .get(affiliateId) as { total: number };
  return row.total;
}

export function getNotifications(affiliateId: number, limit = 50): CommunityNotification[] {
  return db
    .prepare(
      `SELECT community_notifications.id,
              community_notifications.kind,
              community_notifications.post_id,
              community_notifications.comment_id,
              community_notifications.actor_type,
              community_notifications.actor_id,
              community_notifications.detail,
              community_notifications.read_at,
              community_notifications.created_at,
              community_posts.title AS post_title,
              community_spaces.slug AS space_slug,
              CASE community_notifications.actor_type
                WHEN 'admin' THEN 'Equipe Premium Member'
                ELSE COALESCE(affiliates.name, 'Membro')
              END AS actor_name
         FROM community_notifications
         JOIN community_posts ON community_posts.id = community_notifications.post_id
         JOIN community_spaces ON community_spaces.id = community_posts.space_id
         LEFT JOIN affiliates ON affiliates.id = community_notifications.actor_id
              AND community_notifications.actor_type = 'member'
        WHERE community_notifications.affiliate_id = ?
          AND community_posts.status = 'published'
        ORDER BY community_notifications.created_at DESC, community_notifications.id DESC
        LIMIT ?`
    )
    .all(affiliateId, limit) as CommunityNotification[];
}

export function markAllRead(affiliateId: number) {
  db.prepare(
    `UPDATE community_notifications
     SET read_at = CURRENT_TIMESTAMP
     WHERE affiliate_id = ? AND read_at IS NULL`
  ).run(affiliateId);
}
