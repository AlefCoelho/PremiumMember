import { Users } from "lucide-react";
import { enterCommunityAction } from "@/app/admin/comunidade-membro/actions";
import { getSession } from "@/lib/auth";
import { getLinkedAffiliateId } from "@/lib/admin-member";

/**
 * O botao "Entrar na comunidade" da lateral do painel.
 *
 * Na primeira vez pede o nome com que o administrador aparece para os membros;
 * depois e so um clique. O nome pergunta-se uma vez porque o e-mail do admin
 * (contato...) raramente e o nome que ele quer mostrar.
 */
export async function EnterCommunity() {
  const session = await getSession();
  if (!session) return null;
  const vinculado = getLinkedAffiliateId(session.adminId) !== null;

  return (
    <form action={enterCommunityAction} className="enter-community">
      {vinculado ? null : (
        <label>
          Seu nome na comunidade
          <input name="nome" placeholder="Como os membros te veem" maxLength={80} required />
        </label>
      )}
      <button type="submit">
        <Users size={18} />
        Entrar na comunidade
      </button>
    </form>
  );
}
