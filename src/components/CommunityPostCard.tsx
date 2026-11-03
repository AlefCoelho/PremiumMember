import type { CommunityPost } from "@/lib/community";
import { MessageCircle, Pin } from "lucide-react";
import Link from "next/link";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
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

export function CommunityPostCard({ post, showSpace = false }: { post: CommunityPost; showSpace?: boolean }) {
  const href = `/socio/comunidade/${post.space_slug}/${post.id}`;

  return (
    <article className="community-post">
      <header>
        <CommunityAvatar name={post.author_name} />
        <div>
          <strong>{post.author_name}</strong>
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

      <footer>
        <Link href={href}>
          <MessageCircle size={15} />
          {post.comment_count === 1 ? "1 comentario" : `${post.comment_count} comentarios`}
        </Link>
      </footer>
    </article>
  );
}
