import { toggleEventRsvpAction } from "@/app/socio/comunidade/actions";
import { CommunityPostCard } from "@/components/CommunityPostCard";
import { requireAffiliate } from "@/lib/auth";
import { getAvatarUrls } from "@/lib/profiles";
import { publicUrl } from "@/lib/storage";
import {
  attachPostMeta,
  getCommunityPortalData,
  getFeedPosts,
  getPostImagePaths,
  getTrendingPosts,
} from "@/lib/community";
import { attachRsvp, eventDayParts, getUpcomingEvents } from "@/lib/events";
import { CheckCircle2, Flame } from "lucide-react";
import Link from "next/link";

export default async function CommunityFeedPage() {
  const session = await requireAffiliate();
  const { eligibleSales, spaces } = getCommunityPortalData(session.affiliateId);
  const posts = attachPostMeta(getFeedPosts(eligibleSales), session.affiliateId);

  // As duas colunas da direita existem so aqui, no Feed.
  const avatars = getAvatarUrls(posts.map((post) => post.author_id));
  const images = getPostImagePaths(posts.map((post) => post.id));

  const events = attachRsvp(getUpcomingEvents(5), session.affiliateId);
  const trending = getTrendingPosts(eligibleSales, 5);

  return (
    <>
      <header className="community-header">
        <div>
          <p className="eyebrow">Comunidade</p>
          <h1>Feed</h1>
          <p>Tudo que acontece nos espacos que voce participa.</p>
        </div>
      </header>

      <div className="community-feed-layout">
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

        <aside className="community-aside">
          <section className="panel community-aside-panel">
            <div className="panel-header">
              <h2>Eventos futuros</h2>
            </div>
            {events.length ? (
              <ul className="community-aside-events">
                {events.map((event) => {
                  const parts = eventDayParts(event.starts_at);
                  return (
                    <li key={event.id}>
                      <Link className="community-aside-event" href="/socio/comunidade/eventos">
                        <span className="community-event-date">
                          <strong>{parts.day}</strong>
                          <span>{parts.month}</span>
                        </span>
                        <span className="community-aside-event-text">
                          <strong>{event.title}</strong>
                          <span>
                            {parts.time} - {event.rsvp_count} confirmado(s)
                          </span>
                        </span>
                      </Link>
                      <form action={toggleEventRsvpAction}>
                        <input type="hidden" name="event_id" value={event.id} />
                        <button
                          className={
                            event.confirmed ? "community-reaction active" : "community-reaction"
                          }
                          type="submit"
                        >
                          <CheckCircle2 size={14} />
                          {event.confirmed ? "Confirmado" : "Confirmar"}
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="muted">Nenhuma live agendada.</p>
            )}
            <Link className="community-aside-link" href="/socio/comunidade/eventos">
              Ver todos os eventos
            </Link>
          </section>

          <section className="panel community-aside-panel">
            <div className="panel-header">
              <h2>Publicacoes em alta</h2>
            </div>
            {trending.length ? (
              <ul className="community-aside-trending">
                {trending.map((post) => (
                  <li key={post.id}>
                    <Link href={`/socio/comunidade/${post.space_slug}/${post.id}`}>
                      <strong>{post.title}</strong>
                      <span>
                        {post.author_name}
                        {post.featured ? " - destaque" : ""}
                        {post.reaction_total ? ` - ${post.reaction_total} reacao(oes)` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">
                <Flame size={14} /> Nada em alta ainda.
              </p>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
