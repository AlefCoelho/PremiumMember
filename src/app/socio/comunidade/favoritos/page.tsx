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
import { getFavoriteLessons } from "@/lib/lessons";
import { GraduationCap } from "lucide-react";
import Link from "next/link";

export default async function CommunityFavoritesPage() {
  const session = await requireAffiliate();
  const eligibleSales = getMemberEligibleSales(session.affiliateId);
  const posts = attachPostMeta(getFavoritePosts(session.affiliateId, eligibleSales), session.affiliateId);
  const avatars = getAvatarUrls(posts.map((post) => post.author_id));
  const images = getPostImagePaths(posts.map((post) => post.id));
  const aulas = getFavoriteLessons(session.affiliateId, eligibleSales);

  return (
    <>
      <header className="community-header">
        <div>
          <p className="eyebrow">Minha area</p>
          <h1>Favoritos</h1>
          <p>As publicacoes e as aulas que voce salvou para ver depois.</p>
        </div>
      </header>

      {aulas.length ? (
        <section className="panel favorite-lessons">
          <h2>
            <GraduationCap size={16} />
            Aulas salvas
          </h2>
          <ul>
            {aulas.map((aula) => (
              <li key={aula.id}>
                <Link href={`/socio/aula/${aula.slug}`}>{aula.title}</Link>
                <span className="muted">
                  {aula.space_name} - {aula.module_title}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
            <strong>
              {aulas.length ? "Nenhuma publicacao salva." : "Nenhum favorito ainda."}
            </strong>
            <p>Use o marcador no canto de uma publicacao ou de uma aula para guardar aqui.</p>
            <Link className="primary-button" href="/socio/comunidade">
              Ir para o feed
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
