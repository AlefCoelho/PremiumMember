import { BrandLogo } from "@/components/BrandLogo";
import { CommunitySidebar } from "@/components/CommunitySidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { getSession, requireAffiliate } from "@/lib/auth";
import { getLinkedAffiliateId } from "@/lib/admin-member";
import { getCommunityPortalData } from "@/lib/community";
import { getNews } from "@/lib/news";
import { countUnread } from "@/lib/notifications";
import { HandCoins, Settings } from "lucide-react";
import Link from "next/link";

export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAffiliate();
  const data = getCommunityPortalData(session.affiliateId);
  const unread = countUnread(session.affiliateId);
  const novidades = getNews(session.affiliateId, 10);

  // So aparece para o administrador que entrou pela ponte: a conta de membro
  // dele e a vinculada a ele, nao qualquer uma.
  const admin = await getSession();
  const voltaAoPainel = admin ? getLinkedAffiliateId(admin.adminId) === session.affiliateId : false;

  return (
    <div className="community-shell">
      <aside className="community-sidebar">
        <BrandLogo legenda="Comunidade" tamanho={38} />

        <CommunitySidebar groups={data.groups} unread={unread} />

        {voltaAoPainel ? (
          <Link className="community-back" href="/admin/comunidade">
            <Settings size={16} />
            Voltar ao painel de administrador
          </Link>
        ) : null}

        <Link className="community-back" href="/socio/ganhos">
          <HandCoins size={16} />
          Indicacoes e saques
        </Link>
      </aside>

      <main className="community-main">{children}</main>

      {/* Fora do <main> porque o sino e fixo na tela, nao parte do conteudo
          rolavel: dentro do main ele herdaria o scroll e sumiria ao rolar. */}
      <NotificationBell
        naoLidas={unread}
        novidades={novidades.map((item) => ({
          id: item.id,
          kind: item.kind,
          title: item.title,
          detail: item.detail,
          href: item.href,
          created_at: item.created_at,
          nova: item.read_at === null,
        }))}
      />
    </div>
  );
}
