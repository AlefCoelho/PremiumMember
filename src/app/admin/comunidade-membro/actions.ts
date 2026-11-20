"use server";

import { redirect } from "next/navigation";
import { openAffiliateSessionFor, requireAdmin } from "@/lib/auth";
import { ensureMemberForAdmin } from "@/lib/admin-member";
import { getAffiliateById } from "@/lib/db";

// O id da conta de membro nunca vem do formulario: sai do vinculo guardado para
// o administrador da sessao. Sem isso, qualquer admin abriria a sessao de
// qualquer membro mexendo no campo escondido.
export async function enterCommunityAction(formData: FormData) {
  const session = await requireAdmin();

  const nome = String(formData.get("nome") ?? "").trim();
  const affiliateId = await ensureMemberForAdmin(
    { id: session.adminId, email: session.email },
    nome || session.email.split("@")[0]
  );

  const affiliate = getAffiliateById(affiliateId);
  if (!affiliate || affiliate.status !== "active") {
    throw new Error("A conta de membro vinculada esta inativa.");
  }

  await openAffiliateSessionFor({ id: affiliate.id, email: affiliate.email, code: affiliate.code });
  redirect("/socio/comunidade");
}
