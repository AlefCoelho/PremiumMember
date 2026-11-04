import { db } from "@/lib/db";
import { deleteImage, publicUrl } from "@/lib/storage";

// Tabela a parte em vez de coluna nova em affiliates: o motor de afiliados
// continua intocado, e o deploy segue sem ALTER TABLE.
db.exec(`
CREATE TABLE IF NOT EXISTS affiliate_profiles (
  affiliate_id INTEGER PRIMARY KEY REFERENCES affiliates(id) ON DELETE CASCADE,
  avatar_path TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

export function getAvatarPath(affiliateId: number) {
  const row = db
    .prepare("SELECT avatar_path FROM affiliate_profiles WHERE affiliate_id = ?")
    .get(affiliateId) as { avatar_path: string } | undefined;
  return row?.avatar_path || null;
}

export function getAvatarUrl(affiliateId: number) {
  return publicUrl(getAvatarPath(affiliateId));
}

// Troca a foto e apaga a anterior, para nao acumular arquivo orfao no disco.
export function setAvatar(affiliateId: number, storedPath: string) {
  const previous = getAvatarPath(affiliateId);
  db.prepare(
    `INSERT INTO affiliate_profiles (affiliate_id, avatar_path, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT (affiliate_id) DO UPDATE SET avatar_path = excluded.avatar_path, updated_at = CURRENT_TIMESTAMP`
  ).run(affiliateId, storedPath);
  if (previous && previous !== storedPath) deleteImage(previous);
}

export function removeAvatar(affiliateId: number) {
  const previous = getAvatarPath(affiliateId);
  db.prepare("UPDATE affiliate_profiles SET avatar_path = '' WHERE affiliate_id = ?").run(affiliateId);
  if (previous) deleteImage(previous);
}

// Busca as fotos de uma lista de autores de uma vez so.
export function getAvatarUrls(affiliateIds: number[]) {
  const unique = [...new Set(affiliateIds)].filter((id) => Number.isInteger(id) && id > 0);
  if (!unique.length) return new Map<number, string>();

  const rows = db
    .prepare(
      `SELECT affiliate_id, avatar_path FROM affiliate_profiles
       WHERE affiliate_id IN (${unique.map(() => "?").join(",")}) AND avatar_path != ''`
    )
    .all(...unique) as { affiliate_id: number; avatar_path: string }[];

  const map = new Map<number, string>();
  for (const row of rows) {
    const url = publicUrl(row.avatar_path);
    if (url) map.set(row.affiliate_id, url);
  }
  return map;
}
