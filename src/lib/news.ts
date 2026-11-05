import { db } from "@/lib/db";

// Novidades da plataforma: aula nova, espaco novo, evento novo.
//
// Nao entra em community_notifications porque aquela tabela e sobre uma
// publicacao especifica — post_id e NOT NULL e entra na chave UNIQUE. Aula e
// espaco nao tem publicacao, e forcar um post falso para caber ali deixaria o
// sino apontando para conteudo que nao existe.
//
// A linha e uma so, compartilhada por todos: 17 membros hoje, mas fanout de uma
// linha por membro a cada aula publicada cresce rapido e nao paga nada. Quem
// leu fica em community_news_reads; quem nunca leu tem a novidade por nao lida.
db.exec(`
CREATE TABLE IF NOT EXISTS community_news (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  href TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_news_reads (
  news_id INTEGER NOT NULL REFERENCES community_news(id) ON DELETE CASCADE,
  affiliate_id INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  read_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (news_id, affiliate_id)
);

CREATE INDEX IF NOT EXISTS idx_community_news_data ON community_news(created_at);
`);

export type NewsKind = "aula" | "modulo" | "espaco" | "evento";

export type CommunityNews = {
  id: number;
  kind: string;
  title: string;
  detail: string;
  href: string;
  created_at: string;
  read_at: string | null;
};

/**
 * Registra uma novidade. Falha em silencio de proposito: publicar uma aula nao
 * pode quebrar porque o aviso nao entrou.
 */
export function publishNews(input: {
  kind: NewsKind;
  title: string;
  detail?: string;
  href?: string;
}) {
  try {
    db.prepare(
      "INSERT INTO community_news (kind, title, detail, href) VALUES (?, ?, ?, ?)"
    ).run(
      input.kind,
      input.title.slice(0, 160),
      (input.detail ?? "").slice(0, 300),
      (input.href ?? "").slice(0, 300)
    );
  } catch {
    // Nada a fazer: o conteudo entrou, so o aviso ficou de fora.
  }
}

// Novidade anterior a entrada do membro nao conta. Sem este corte, quem se
// cadastra hoje abre a plataforma com o sino marcando meses de historico.
const escopoDoMembro = `
  FROM community_news
  JOIN affiliates ON affiliates.id = ?
  LEFT JOIN community_news_reads
    ON community_news_reads.news_id = community_news.id
   AND community_news_reads.affiliate_id = affiliates.id
  WHERE community_news.created_at >= affiliates.created_at
`;

export function countUnreadNews(affiliateId: number) {
  const row = db
    .prepare(
      `SELECT COUNT(*) AS total ${escopoDoMembro} AND community_news_reads.news_id IS NULL`
    )
    .get(affiliateId) as { total: number };
  return row.total;
}

export function getNews(affiliateId: number, limit = 30): CommunityNews[] {
  return db
    .prepare(
      `SELECT community_news.id,
              community_news.kind,
              community_news.title,
              community_news.detail,
              community_news.href,
              community_news.created_at,
              community_news_reads.read_at
         ${escopoDoMembro}
         ORDER BY community_news.created_at DESC, community_news.id DESC
         LIMIT ?`
    )
    .all(affiliateId, limit) as CommunityNews[];
}

export function markNewsRead(affiliateId: number) {
  db.prepare(
    `INSERT OR IGNORE INTO community_news_reads (news_id, affiliate_id)
     SELECT community_news.id, ?
       FROM community_news
       JOIN affiliates ON affiliates.id = ?
      WHERE community_news.created_at >= affiliates.created_at`
  ).run(affiliateId, affiliateId);
}
