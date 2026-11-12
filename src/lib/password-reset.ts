import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { db, getAffiliateBaseUrl, getAffiliateByEmail, getAffiliateById } from "@/lib/db";

// Tabela nova, criada do mesmo jeito aditivo do resto: nenhuma tabela existente
// e tocada, entao o deploy nao mexe no que ja esta no banco.
db.exec(`
CREATE TABLE IF NOT EXISTS affiliate_password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  affiliate_id INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_resets_affiliate
  ON affiliate_password_resets(affiliate_id, expires_at);
`);

const TOKEN_TTL_MINUTES = 60;

export type ResetRequestResult = {
  // O link so volta preenchido quando quem pediu foi o admin. No fluxo publico
  // ele nunca sai daqui, para nao virar um jeito de redefinir a senha alheia.
  link?: string;
  affiliateName?: string;
};

// Guardamos o hash, nunca o token. Se alguem ler a tabela, nao consegue montar
// um link valido a partir dela.
function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function expiresAt() {
  return new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000).toISOString();
}

function invalidateOpenTokens(affiliateId: number) {
  db.prepare(
    `UPDATE affiliate_password_resets
     SET used_at = CURRENT_TIMESTAMP
     WHERE affiliate_id = ? AND used_at IS NULL`
  ).run(affiliateId);
}

export function buildResetLink(token: string) {
  return `${getAffiliateBaseUrl()}/socio/redefinir-senha?token=${encodeURIComponent(token)}`;
}

// Gera um token novo e invalida os anteriores: um pedido novo sempre derruba o
// link antigo.
export function createResetToken(affiliateId: number) {
  const token = crypto.randomBytes(32).toString("hex");

  const run = db.transaction(() => {
    invalidateOpenTokens(affiliateId);
    db.prepare(
      `INSERT INTO affiliate_password_resets (affiliate_id, token_hash, expires_at)
       VALUES (?, ?, ?)`
    ).run(affiliateId, hashToken(token), expiresAt());
  });
  run();

  return token;
}

export function createResetTokenForEmail(email: string) {
  const affiliate = getAffiliateByEmail(email);
  if (!affiliate || affiliate.status !== "active") return null;
  return { affiliate, token: createResetToken(affiliate.id) };
}

export type ResetTokenCheck =
  | { ok: true; affiliateId: number; affiliateName: string }
  | { ok: false; reason: "invalid" | "expired" | "used" };

export function checkResetToken(token: string): ResetTokenCheck {
  if (!token) return { ok: false, reason: "invalid" };

  const row = db
    .prepare(
      `SELECT id, affiliate_id, expires_at, used_at
       FROM affiliate_password_resets
       WHERE token_hash = ?`
    )
    .get(hashToken(token)) as
    | { id: number; affiliate_id: number; expires_at: string; used_at: string | null }
    | undefined;

  if (!row) return { ok: false, reason: "invalid" };
  if (row.used_at) return { ok: false, reason: "used" };
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, reason: "expired" };

  const affiliate = getAffiliateById(row.affiliate_id);
  if (!affiliate) return { ok: false, reason: "invalid" };

  return { ok: true, affiliateId: row.affiliate_id, affiliateName: affiliate.name };
}

// Troca a senha e queima o token no mesmo passo, para o link nao servir duas
// vezes se a pessoa voltar na pagina.
export async function consumeResetToken(token: string, newPassword: string) {
  const check = checkResetToken(token);
  if (!check.ok) return check;

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const run = db.transaction(() => {
    db.prepare("UPDATE affiliates SET password_hash = ? WHERE id = ?").run(
      passwordHash,
      check.affiliateId
    );
    invalidateOpenTokens(check.affiliateId);
  });
  run();

  return check;
}

export function cleanupExpiredTokens() {
  db.prepare(
    `DELETE FROM affiliate_password_resets
     WHERE used_at IS NOT NULL OR expires_at < ?`
  ).run(new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString());
}

// Envio por e-mail e opcional: so acontece se as duas variaveis existirem.
// Sem elas o sistema nao finge que mandou — quem gera o link e o admin, que
// entrega pelo canal que ja usa com o membro.
export function isMailConfigured() {
  return Boolean(
    (process.env.RESEND_API_KEY ?? "").trim() && (process.env.MAIL_FROM ?? "").trim()
  );
}

// Envio generico pela API do Resend. Devolve false em vez de lancar: quem chama
// decide o que dizer a pessoa, e nunca mostra o motivo tecnico da falha.
export async function sendMail(input: { to: string; subject: string; text: string }) {
  if (!isMailConfigured()) return false;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${(process.env.RESEND_API_KEY ?? "").trim()}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: (process.env.MAIL_FROM ?? "").trim(),
        to: input.to,
        subject: input.subject,
        text: input.text,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function sendResetEmail(to: string, name: string, link: string) {
  return sendMail({
    to,
    subject: "Redefinir sua senha - Premium Member",
    text: [
      `Ola, ${name}.`,
      "",
      "Voce pediu para redefinir a senha do seu acesso ao Premium Member.",
      `Abra este link para criar uma senha nova: ${link}`,
      "",
      `O link vale por ${TOKEN_TTL_MINUTES} minutos e so pode ser usado uma vez.`,
      "Se nao foi voce que pediu, ignore esta mensagem: sua senha atual continua valendo.",
    ].join("\n"),
  });
}

export { TOKEN_TTL_MINUTES };
