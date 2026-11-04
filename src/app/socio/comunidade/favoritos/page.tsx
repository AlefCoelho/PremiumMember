import { CommunityPostCard } from "@/components/CommunityPostCard";
import { requireAffiliate } from "@/lib/auth";
import { getAvatarUrls } from "@/lib/profiles";
import { publicUrl } from "@/lib/storage";
import {
  attachPostMeta,
  getFavoritePosts,
  getMemberEligibleSales,
  getPostImagePaths,
} from "@/lib/community";
import Link from "next/link";

export default async function CommunityFavoritesPage() {
  const session = await requireAffiliate();
  const eligibleSales = getMemberEligibleSales(session.affiliateId);
  const posts = attachPostMeta(getFavoritePosts(session.affiliateId, eligibleSales), session.affiliateId);
  const avatars = getAvatarUrls(posts.map((post) => post.author_id));
  const images = getPostImagePaths(posts.map((post) => post.id));

  return (
    <>
      <header className="community-header">
        <div>
          <p className="eyebrow">Minha area</p>
          <h1>Favoritos</h1>
          <p>As publicacoes que voce salvou para ler depois.</p>
        </div>
      </header>

      <section className="community-feed">
        {posts.length ? (
          posts.map((post) => (
            <CommunityPostCard
              key={post.id}
              post={post}
              showSpace
              avatarUrl={post.author_type === "member" ? avatars.get(post.author_id) : null}
              imageUrl={publicUrl(images.get(post.id))}
            />
          ))
        ) : (
          <div className="panel community-empty">
            <strong>Nenhum favorito ainda.</strong>
            <p>Use o marcador no canto de uma publicacao para guardar aqui.</p>
            <Link className="primary-button" href="/socio/comunidade">
              Ir para o feed
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
