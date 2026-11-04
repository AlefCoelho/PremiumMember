import { CommunitySidebar } from "@/components/CommunitySidebar";
import { requireAffiliate } from "@/lib/auth";
import { getCommunityPortalData } from "@/lib/community";
import { HandCoins } from "lucide-react";
import Link from "next/link";

export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAffiliate();
  const data = getCommunityPortalData(session.affiliateId);

  return (
    <div className="community-shell">
      <aside className="community-sidebar">
        <div className="brand">
          <span className="brand-mark">PM</span>
          <div>
            <strong>Comunidade</strong>
            <span>Premium Member</span>
          </div>
        </div>

        <CommunitySidebar groups={data.groups} />

        <Link className="community-back" href="/socio/ganhos">
          <HandCoins size={16} />
          Indicacoes e saques
        </Link>
      </aside>

      <main className="community-main">{children}</main>
    </div>
  );
}
