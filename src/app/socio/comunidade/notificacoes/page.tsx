import { markNotificationsReadAction } from "@/app/socio/comunidade/actions";
import { requireAffiliate } from "@/lib/auth";
import { isReactionKind, reactionKinds } from "@/lib/community";
import { getNotifications } from "@/lib/notifications";
import { getAvatarUrls } from "@/lib/profiles";
import { publicUrl } from "@/lib/storage";
import { Bell, MessageSquare } from "lucide-react";
import Link from "next/link";

const reactionLabel = new Map(reactionKinds.map((item) => [item.value, item]));

function quando(valor: string) {
  const data = new Date(`${valor.replace(" ", "T")}Z`);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default async function CommunityNotificationsPage() {
  const session = await requireAffiliate();
  const items = getNotifications(session.affiliateId);
  const naoLidas = items.filter((item) => !item.read_at).length;
  const avatars = getAvatarUrls(
    items.filter((item) => item.actor_type === "member").map((item) => item.actor_id)
  );

  return (
    <>
      <header className="community-header notification-header">
        <div>
          <p className="eyebrow">Minha area</p>
          <h1>Notificacoes</h1>
          <p>
            {naoLidas > 0
              ? `${naoLidas} ${naoLidas === 1 ? "novidade" : "novidades"} desde a ultima vez.`
              : "Quem comentou ou reagiu nas suas publicacoes aparece aqui."}
          </p>
        </div>

        {naoLidas > 0 ? (
          <form action={markNotificationsReadAction}>
            <button className="outline-button" type="submit">
              Marcar todas como lidas
            </button>
          </form>
        ) : null}
      </header>

      <section className="community-feed">
        {items.length ? (
          items.map((item) => {
            const avatar = item.actor_type === "member" ? publicUrl(avatars.get(item.actor_id)) : null;
            const reacao =
              item.kind === "reaction" && isReactionKind(item.detail)
                ? reactionLabel.get(item.detail)
                : undefined;
            const destino = `/socio/comunidade/${item.space_slug}/${item.post_id}`;

            return (
              <Link
                key={item.id}
                href={destino}
                className={item.read_at ? "notification-row" : "notification-row unread"}
              >
                <span className="notification-avatar">
                  {/* <img> e nao next/image: o otimizador busca a imagem pelo
                      servidor, sem o cookie de sessao, e /uploads exige sessao. */}
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt="" width={40} height={40} />
                  ) : item.kind === "comment" ? (
                    <MessageSquare size={18} />
                  ) : (
                    <Bell size={18} />
                  )}
                </span>

                <span className="notification-body">
                  <strong>{item.actor_name}</strong>
                  {item.kind === "comment" ? (
                    <> comentou na sua publicacao</>
                  ) : (
                    <> reagiu {reacao ? `com ${reacao.emoji} ${reacao.label}` : ""} na sua publicacao</>
                  )}
                  <em>{item.post_title}</em>
                </span>

                <span className="notification-when">{quando(item.created_at)}</span>
              </Link>
            );
          })
        ) : (
          <div className="panel community-empty">
            <strong>Nada por aqui ainda.</strong>
            <p>Quando alguem comentar ou reagir numa publicacao sua, voce vai saber nesta pagina.</p>
            <Link className="primary-button" href="/socio/comunidade">
              Ir para o feed
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
