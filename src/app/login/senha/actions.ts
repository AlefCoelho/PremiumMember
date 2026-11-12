"use server";

import { redirect } from "next/navigation";
import { ADMIN_MIN_PASSWORD, consumeAdminToken, requestAdminReset } from "@/lib/admin-reset";

function texto(formData: FormData, chave: string) {
  return String(formData.get(chave) ?? "").trim();
}

// A resposta e a mesma para e-mail conhecido, desconhecido e pedido repetido:
// esta tela e publica e nao pode virar um jeito de descobrir quem e admin. A
// unica diferenca visivel e "sem e-mail configurado", que e estado do sistema,
// nao dado de ninguem.
export async function requestAdminResetAction(formData: FormData) {
  const email = texto(formData, "email").toLowerCase();
  if (!email) redirect("/login/esqueci-senha?erro=email");

  const resultado = await requestAdminReset(email);
  redirect(resultado === "sem-email" ? "/login/esqueci-senha?sem-email=1" : "/login/esqueci-senha?enviado=1");
}

export async function submitAdminNewPasswordAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const senha = String(formData.get("senha") ?? "");
  const confirma = String(formData.get("senha_confirma") ?? "");
  const volta = `/login/redefinir-senha?token=${encodeURIComponent(token)}`;

  if (senha.length < ADMIN_MIN_PASSWORD) redirect(`${volta}&erro=curta`);
  if (senha !== confirma) redirect(`${volta}&erro=diferente`);

  const resultado = await consumeAdminToken(token, senha);
  if (!resultado.ok) redirect(`${volta}&erro=${resultado.reason}`);

  redirect("/login?senha=redefinida");
}
