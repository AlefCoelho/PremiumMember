"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getAdminById, setAdminPasswordHash } from "@/lib/db";

const PATH = "/admin/senhas";

// Minimo baixo de proposito: senha que o Alef lembra vale mais que senha forte
// que ele esquece e que o obriga a mexer no banco de novo.
const MINIMO = 8;

function texto(formData: FormData, chave: string) {
  return String(formData.get(chave) ?? "");
}

// Erro volta como parametro na propria pagina, nunca como excecao: excecao em
// server action vira tela de erro de servidor e a pessoa perde o que digitou.
function erro(motivo: string): never {
  redirect(`${PATH}?senha=${motivo}#minha-senha`);
}

export async function changeAdminPasswordAction(formData: FormData) {
  const session = await requireAdmin();

  const atual = texto(formData, "senha_atual");
  const nova = texto(formData, "senha_nova");
  const confirma = texto(formData, "senha_confirma");

  if (!atual || !nova || !confirma) erro("vazio");
  if (nova.length < MINIMO) erro("curta");
  if (nova !== confirma) erro("diferente");

  const admin = getAdminById(session.adminId);
  if (!admin) erro("inexistente");

  const confere = await bcrypt.compare(atual, admin.password_hash);
  if (!confere) erro("atual");

  // Mesma senha de antes passaria em tudo acima e nao mudaria nada; avisar e
  // melhor que dizer "pronto" sem ter feito nada.
  if (await bcrypt.compare(nova, admin.password_hash)) erro("igual");

  setAdminPasswordHash(admin.id, await bcrypt.hash(nova, 10));

  revalidatePath(PATH);
  redirect(`${PATH}?senha=ok#minha-senha`);
}
