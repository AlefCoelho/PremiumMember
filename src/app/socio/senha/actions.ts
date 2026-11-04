"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getAffiliateById } from "@/lib/db";
import {
  buildResetLink,
  consumeResetToken,
  createResetToken,
  createResetTokenForEmail,
  isMailConfigured,
  sendResetEmail,
} from "@/lib/password-reset";

function asText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

// O pedido publico nunca diz se o e-mail existe: isso transformaria a tela num
// jeito de descobrir quem e membro. A resposta e a mesma nos dois casos.
export async function requestPasswordResetAction(formData: FormData) {
  const email = asText(formData, "email").toLowerCase();
  if (!email) redirect("/socio/recuperar-senha?error=email");

  const created = createResetTokenForEmail(email);
  if (created && isMailConfigured()) {
    await sendResetEmail(created.affiliate.email, created.affiliate.name, buildResetLink(created.token));
  }

  redirect("/socio/recuperar-senha?enviado=1");
}

export async function submitNewPasswordAction(formData: FormData) {
  const token = asText(formData, "token");
  const password = asText(formData, "password");
  const passwordConfirm = asText(formData, "password_confirm");

  if (password.length < 6 || password !== passwordConfirm) {
    redirect(`/socio/redefinir-senha?token=${encodeURIComponent(token)}&error=password`);
  }

  const result = await consumeResetToken(token, password);
  if (!result.ok) {
    redirect(`/socio/redefinir-senha?token=${encodeURIComponent(token)}&error=${result.reason}`);
  }

  redirect("/socio/login?senha=redefinida");
}

// Caminho do admin, para quando nao houver e-mail configurado: gera o link e
// mostra uma vez na tela, para ser entregue pelo canal que ele ja usa.
export async function adminCreateResetLinkAction(formData: FormData) {
  await requireAdmin();
  const affiliateId = Number(asText(formData, "affiliate_id"));
  if (!Number.isInteger(affiliateId) || affiliateId <= 0) {
    throw new Error("Membro invalido.");
  }

  const affiliate = getAffiliateById(affiliateId);
  if (!affiliate) throw new Error("Membro nao encontrado.");

  const token = createResetToken(affiliateId);
  const link = buildResetLink(token);

  let enviado = "0";
  if (isMailConfigured()) {
    enviado = (await sendResetEmail(affiliate.email, affiliate.name, link)) ? "1" : "falhou";
  }

  redirect(
    `/admin/senhas?membro=${affiliateId}&enviado=${enviado}&token=${encodeURIComponent(token)}`
  );
}
