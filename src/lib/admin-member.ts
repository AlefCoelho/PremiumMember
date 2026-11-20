import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db, getAffiliateByCode, getAffiliateByEmail } from "@/lib/db";

// A ponte entre a conta de administrador e a conta de membro.
//
// Admin e membro sao tabelas diferentes, com logins e cookies diferentes, e
// continuam sendo. Esta tabela so diz "o admin X e a pessoa Y na comunidade",
// para o painel poder abrir a sessao de membro sem pedir um segundo login.
//
// Tabela propria, como todas as novas: nada de ALTER TABLE em admins nem em
// affiliates.
db.exec(`
CREATE TABLE IF NOT EXISTS admin_member_links (
  admin_id INTEGER PRIMARY KEY REFERENCES admins(id) ON DELETE CASCADE,
  affiliate_id INTEGER NOT NULL UNIQUE REFERENCES affiliates(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

export function getLinkedAffiliateId(adminId: number): number | null {
  const row = db
    .prepare("SELECT affiliate_id FROM admin_member_links WHERE admin_id = ?")
    .get(adminId) as { affiliate_id: number } | undefined;
  return row?.affiliate_id ?? null;
}

/** Contas de membro que pertencem a um administrador: fora do ranking, com selo. */
export function getAdminAffiliateIds(): Set<number> {
  const rows = db.prepare("SELECT affiliate_id FROM admin_member_links").all() as {
    affiliate_id: number;
  }[];
  return new Set(rows.map((row) => row.affiliate_id));
}

function newCode() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const code = `EQUIPE${Math.floor(1000 + Math.random() * 9000)}`;
    if (!getAffiliateByCode(code)) return code;
  }
  return `EQUIPE${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

/**
 * Garante a conta de membro do administrador e devolve o id dela.
 *
 * Se ja existe conta de membro com o mesmo e-mail, vincula essa em vez de criar
 * outra: o e-mail do admin ja foi provado no login do painel, entao nao ha
 * ninguem se passando por ninguem.
 *
 * A senha da conta nova e aleatoria e ninguem a conhece: o admin entra pela
 * ponte, nunca por /socio/login. Se um dia quiser entrar por la, usa
 * "Esqueci a senha" — o e-mail ja esta ligado.
 */
export async function ensureMemberForAdmin(admin: { id: number; email: string }, nome: string) {
  const existente = getLinkedAffiliateId(admin.id);
  if (existente) return existente;

  const email = admin.email.toLowerCase();
  const mesmoEmail = getAffiliateByEmail(email);

  let affiliateId: number;
  if (mesmoEmail) {
    affiliateId = mesmoEmail.id;
  } else {
    const hash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);
    const result = db
      .prepare(
        `INSERT INTO affiliates (sponsor_id, name, email, password_hash, phone, code, notes)
         VALUES (NULL, ?, ?, ?, NULL, ?, ?)`
      )
      .run(
        nome.slice(0, 80),
        email,
        hash,
        newCode(),
        "Conta de membro da equipe, criada a partir do painel de administrador."
      );
    affiliateId = Number(result.lastInsertRowid);
  }

  db.prepare("INSERT OR IGNORE INTO admin_member_links (admin_id, affiliate_id) VALUES (?, ?)").run(
    admin.id,
    affiliateId
  );
  return affiliateId;
}
