import { reactToPostAction, toggleFavoriteAction } from "@/app/socio/comunidade/actions";
import type { CommunityPost, CommunityPostWithMeta } from "@/lib/community";
import { reactionKinds } from "@/lib/community";
import { Bookmark, MessageCircle, Pin } from "lucide-react";
import Link from "next/link";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

// Os dois primeiros nomes, como o membro se cadastrou.
export function shortName(name: string) {
  return name.split(/\s+/).slice(0, 2).join(" ");
}

export function timeAgo(value: string) {
  const created = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  const minutes = Math.floor((Date.now() - created.getTime()) / 60000);
  if (!Number.isFinite(minutes) || minutes < 1) return "agora";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} d`;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(created);
}

export function CommunityAvatar({ name }: { name: string }) {
  return <span className="community-avatar">{initials(name)}</span>;
}

function hasMeta(post: CommunityPost | CommunityPostWithMeta): post is CommunityPostWithMeta {
  return "reactions" in post;
}

export function CommunityReactionBar({ post }: { post: CommunityPostWithMeta }) {
  return (
    <div className="community-reactions">
      {reactionKinds.map((kind) => {
        const total = post.reactions[kind.value] ?? 0;
        const active = post.my_reaction === kind.value;
        return (
          <form action={reactToPostAction} key={kind.value}>
            <input type="hidden" name="post_id" value={post.id} />
            <input type="hidden" name="kind" value={kind.value} />
            <button
              className={active ? "community-reaction active" : "community-reaction"}
              type="submit"
              title={kind.label}
              aria-label={kind.label}
            >
              <span aria-hidden>{kind.emoji}</span>
              {total ? <em>{total}</em> : null}
            </button>
          </form>
        );
      })}

      <form action={toggleFavoriteAction} className="community-favorite-form">
        <input type="hidden" name="post_id" value={post.id} />
        <button
          className={post.favorited ? "community-reaction favorited" : "community-reaction"}
          type="submit"
          title={post.favorited ? "Remover dos favoritos" : "Salvar nos favoritos"}
          aria-label={post.favorited ? "Remover dos favoritos" : "Salvar nos favoritos"}
        >
          <Bookmark size={15} fill={post.favorited ? "currentColor" : "none"} />
        </button>
      </form>
    </div>
  );
}

export function CommunityPostCard({
  post,
  showSpace = false,
}: {
  post: CommunityPost | CommunityPostWithMeta;
  showSpace?: boolean;
}) {
  const href = `/socio/comunidade/${post.space_slug}/${post.id}`;

  return (
    <article className="community-post">
      <header>
        <CommunityAvatar name={post.author_name} />
        <div>
          <strong>{shortName(post.author_name)}</strong>
          <span>
            {timeAgo(post.created_at)}
            {showSpace ? ` - ${post.space_name}` : ""}
          </span>
        </div>
        {post.author_type === "admin" ? <span className="badge neutral">Administrador</span> : null}
        {post.pinned ? <Pin size={15} className="community-pin" /> : null}
      </header>

      <Link className="community-post-title" href={href}>
        {post.title}
      </Link>
      <p className="community-post-body">{post.body}</p>

      {hasMeta(post) ? <CommunityReactionBar post={post} /> : null}

      <footer>
        <Link href={href}>
          <MessageCircle size={15} />
          {post.comment_count === 1 ? "1 comentario" : `${post.comment_count} comentarios`}
        </Link>
      </footer>
    </article>
  );
}
