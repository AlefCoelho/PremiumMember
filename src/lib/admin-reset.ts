import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { db, getAdminByEmail, getAdminById, getAffiliateBaseUrl, setAdminPasswordHash } from "@/lib/db";
import { isMailConfigured, sendMail } from "@/lib/password-reset";

// Recuperacao de senha do ADMINISTRADOR. Fica separada da do membro de
// proposito: tabela propria e rota propria, para que um link de membro nunca
// sirva para entrar no painel e vice-versa. Tabela nova, criada do mesmo jeito
// aditivo do resto; nenhuma tabela existente e tocada.
db.exec(`
CREATE TABLE IF NOT EXISTS admin_password_resets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_resets_admin
  ON admin_password_resets(admin_id, created_at);
`);

// Mais curto que o do membro: quem entra no painel enxerga tudo.
export const ADMIN_TOKEN_TTL_MINUTES = 30;

// Dentro desta janela um novo pedido nao gera outro link. Sem isso, qualquer
// pessoa que soubesse o e-mail do admin poderia disparar e-mails sem parar e
// derrubar o link valido a cada pedido.
const COOLDOWN_MINUTES = 2;

export const ADMIN_MIN_PASSWORD = 8;

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function invalidateOpen(adminId: number) {
  db.prepare(
    `UPDATE admin_password_resets SET used_at = CURRENT_TIMESTAMP
     WHERE admin_id = ? AND used_at IS NULL`
  ).run(adminId);
}

export function buildAdminResetLink(token: string) {
  return `${getAffiliateBaseUrl()}/login/redefinir-senha?token=${encodeURIComponent(token)}`;
}

export type AdminResetRequest = "enviado" | "sem-email" | "ignorado";

// O resultado volta so para a acao do servidor, que o traduz numa resposta
// igual para todo mundo. "ignorado" cobre e-mail desconhecido e pedido dentro da
// janela de espera: quem pediu nao consegue distinguir os dois.
export async function requestAdminReset(email: string): Promise<AdminResetRequest> {
  // Sem e-mail configurado ninguem receberia o link. Nao gera token a toa.
  if (!isMailConfigured()) return "sem-email";

  const admin = getAdminByEmail(email);
  if (!admin) return "ignorado";

  const recente = db
    .prepare(
      `SELECT 1 FROM admin_password_resets
       WHERE admin_id = ? AND created_at > ? LIMIT 1`
    )
    .get(admin.id, new Date(Date.now() - COOLDOWN_MINUTES * 60_000).toISOString().replace("T", " ").slice(0, 19));
  if (recente) return "ignorado";

  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + ADMIN_TOKEN_TTL_MINUTES * 60_000).toISOString();

  db.transaction(() => {
    invalidateOpen(admin.id);
    db.prepare(
      `INSERT INTO admin_password_resets (admin_id, token_hash, expires_at) VALUES (?, ?, ?)`
    ).run(admin.id, hashToken(token), expires);
  })();

  // O link so sai por e-mail, para o endereco GUARDADO no banco. Nunca volta
  // para o navegador de quem pediu: seria entregar o painel a quem digitasse o
  // e-mail certo.
  const entregue = await sendMail({
    to: admin.email,
    subject: "Redefinir a senha do painel - Premium Member",
    text: [
      "Alguem pediu para redefinir a senha do painel de administrador do Premium Member.",
      "",
      `Abra este link para criar uma senha nova: ${buildAdminResetLink(token)}`,
      "",
      `O link vale por ${ADMIN_TOKEN_TTL_MINUTES} minutos e so pode ser usado uma vez.`,
      "Se nao foi voce, ignore esta mensagem: a senha atual continua valendo.",
    ].join("\n"),
  });

  // A resposta para quem pediu nao muda: dizer "falhou" so quando o e-mail existe
  // revelaria quem e administrador. A falha fica no journal do servico, sem o
  // endereco e sem o token.
  if (!entregue) {
    console.error("[admin-reset] o provedor de e-mail recusou o envio. Confira RESEND_API_KEY e MAIL_FROM.");
  }

  return "enviado";
}

export type AdminTokenCheck =
  | { ok: true; adminId: number }
  | { ok: false; reason: "invalid" | "expired" | "used" };

export function checkAdminToken(token: string): AdminTokenCheck {
  if (!token) return { ok: false, reason: "invalid" };

  const row = db
    .prepare(
      `SELECT admin_id, expires_at, used_at FROM admin_password_resets WHERE token_hash = ?`
    )
    .get(hashToken(token)) as { admin_id: number; expires_at: string; used_at: string | null } | undefined;

  if (!row) return { ok: false, reason: "invalid" };
  if (row.used_at) return { ok: false, reason: "used" };
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, reason: "expired" };
  if (!getAdminById(row.admin_id)) return { ok: false, reason: "invalid" };

  return { ok: true, adminId: row.admin_id };
}

// Troca a senha e queima o token no mesmo passo, para o link nao servir duas
// vezes se a pessoa voltar na pagina.
export async function consumeAdminToken(token: string, newPassword: string) {
  const check = checkAdminToken(token);
  if (!check.ok) return check;

  const hash = await bcrypt.hash(newPassword, 10);
  db.transaction(() => {
    setAdminPasswordHash(check.adminId, hash);
    invalidateOpen(check.adminId);
  })();

  return check;
}
