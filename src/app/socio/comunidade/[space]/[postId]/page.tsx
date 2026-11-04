import { createCommunityCommentAction } from "@/app/socio/comunidade/actions";
import { CommunityAvatar, timeAgo } from "@/components/CommunityPostCard";
import { requireAffiliate } from "@/lib/auth";
import { getMemberEligibleSales, getPostById, getPostComments, getSpaceBySlug } from "@/lib/community";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function CommunityPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ space: string; postId: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const session = await requireAffiliate();
  const { space: spaceSlug, postId } = await params;
  const { erro } = await searchParams;
  const space = getSpaceBySlug(spaceSlug);
  if (!space) notFound();

  if (space.min_eligible_sales > getMemberEligibleSales(session.affiliateId)) {
    return (
      <div className="panel community-empty">
        <strong>Espaco bloqueado.</strong>
        <p>Este espaco libera a partir de {space.min_eligible_sales} vendas liberadas.</p>
      </div>
    );
  }

  const post = getPostById(Number(postId));
  if (!post || post.space_id !== space.id) notFound();
  const comments = getPostComments(post.id);

  return (
    <>
      <header className="community-header">
        <div>
          <Link className="community-back-link" href={`/socio/comunidade/${space.slug}`}>
            <ArrowLeft size={15} />
            {space.name}
          </Link>
          <h1>{post.title}</h1>
        </div>
      </header>

      <article className="panel community-post-full">
        <header>
          <CommunityAvatar name={post.author_name} />
          <div>
            <strong>{post.author_name}</strong>
            <span>{timeAgo(post.created_at)}</span>
          </div>
          {post.author_type === "admin" ? <span className="badge neutral">Administrador</span> : null}
        </header>
        <p>{post.body}</p>
      </article>

      <section className="panel community-comments">
        <div className="panel-header">
          <div>
            <h2>{comments.length === 1 ? "1 comentario" : `${comments.length} comentarios`}</h2>
          </div>
        </div>

        <ul className="community-comment-list">
          {comments.length ? (
            comments.map((comment) => (
              <li key={comment.id}>
                <CommunityAvatar name={comment.author_name} />
                <div>
                  <strong>
                    {comment.author_name}
                    <em>{timeAgo(comment.created_at)}</em>
                  </strong>
                  <p>{comment.body}</p>
                </div>
              </li>
            ))
          ) : (
            <li className="community-comment-empty">Nenhum comentario ainda. Comece a conversa.</li>
          )}
        </ul>

        <form action={createCommunityCommentAction} className="stack community-comment-form">
          <input type="hidden" name="post_id" value={post.id} />
          <label>
            Seu comentario
            <textarea name="body" rows={3} placeholder="Escreva um comentario..." maxLength={4000} required />
          </label>
          {erro === "link" ? (
            <p className="form-error">
              Link externo nao e permitido na comunidade. Tire o endereco e comente de novo.
            </p>
          ) : null}
          <button className="primary-button" type="submit">
            Comentar
          </button>
        </form>
      </section>
    </>
  );
}
