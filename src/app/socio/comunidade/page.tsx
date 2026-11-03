import { CommunityPostCard } from "@/components/CommunityPostCard";
import { requireAffiliate } from "@/lib/auth";
import { getCommunityPortalData, getFeedPosts } from "@/lib/community";
import Link from "next/link";

export default async function CommunityFeedPage() {
  const session = await requireAffiliate();
  const { eligibleSales, spaces } = getCommunityPortalData(session.affiliateId);
  const posts = getFeedPosts(eligibleSales);

  return (
    <>
      <header className="community-header">
        <div>
          <p className="eyebrow">Comunidade</p>
          <h1>Feed</h1>
          <p>Tudo que acontece nos espacos que voce participa.</p>
        </div>
      </header>

      <section className="community-feed">
        {posts.length ? (
          posts.map((post) => <CommunityPostCard key={post.id} post={post} showSpace />)
        ) : (
          <div className="panel community-empty">
            <strong>Nenhuma publicacao ainda.</strong>
            <p>Escolha um espaco na lateral e faca a primeira publicacao da comunidade.</p>
            {spaces.length ? (
              <Link className="primary-button" href={`/socio/comunidade/${spaces[0].slug}`}>
                Ir para {spaces[0].name}
              </Link>
            ) : null}
          </div>
        )}
      </section>
    </>
  );
}
