import { createCommunityPostAction } from "@/app/socio/comunidade/actions";
import { CommunityPostCard } from "@/components/CommunityPostCard";
import { requireAffiliate } from "@/lib/auth";
import { attachPostMeta, getMemberEligibleSales, getSpaceBySlug, getSpacePosts } from "@/lib/community";
import { notFound } from "next/navigation";

const kindLabel: Record<string, string> = {
  posts: "Discussao",
  support: "Suporte",
  lessons: "Aulas",
};

export default async function CommunitySpacePage({
  params,
  searchParams,
}: {
  params: Promise<{ space: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const session = await requireAffiliate();
  const { space: spaceSlug } = await params;
  const { erro } = await searchParams;
  const space = getSpaceBySlug(spaceSlug);
  if (!space) notFound();

  if (space.min_eligible_sales > getMemberEligibleSales(session.affiliateId)) {
    return (
      <div className="panel community-empty">
        <strong>Espaco bloqueado.</strong>
        <p>
          Este espaco libera a partir de {space.min_eligible_sales} vendas liberadas. Continue indicando para
          desbloquear.
        </p>
      </div>
    );
  }

  const posts = attachPostMeta(getSpacePosts(space.id), session.affiliateId);

  return (
    <>
      <header className="community-header">
        <div>
          <p className="eyebrow">{kindLabel[space.kind] ?? "Espaco"}</p>
          <h1>{space.name}</h1>
          <p>{space.description}</p>
        </div>
      </header>

      <section className="panel community-composer">
        <form action={createCommunityPostAction} className="stack">
          <input type="hidden" name="space_slug" value={space.slug} />
          <label>
            Titulo
            <input name="title" placeholder="Sobre o que voce quer falar?" maxLength={160} required />
          </label>
          <label>
            Mensagem
            <textarea name="body" rows={4} placeholder="Escreva aqui..." maxLength={8000} required />
          </label>
          {erro === "link" ? (
            <p className="form-error">
              Link externo nao e permitido na comunidade. Tire o endereco e publique de novo.
            </p>
          ) : null}
          <button className="primary-button" type="submit">
            Publicar
          </button>
        </form>
      </section>

      <section className="community-feed">
        {posts.length ? (
          posts.map((post) => <CommunityPostCard key={post.id} post={post} />)
        ) : (
          <div className="panel community-empty">
            <strong>Nenhuma publicacao neste espaco.</strong>
            <p>Seja o primeiro a publicar aqui.</p>
          </div>
        )}
      </section>
    </>
  );
}
