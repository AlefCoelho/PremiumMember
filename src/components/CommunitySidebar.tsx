"use client";

import type { CommunityGroupWithSpaces } from "@/lib/community";
import {
  Bell,
  Bookmark,
  CalendarClock,
  Clock,
  GraduationCap,
  LayoutGrid,
  LifeBuoy,
  Lock,
  MessagesSquare,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const kindIcon = {
  posts: MessagesSquare,
  support: LifeBuoy,
  lessons: GraduationCap,
} as const;

// Os destinos fixos. No computador sao a lista de cima da lateral; no celular
// viram a barra de baixo, como num app.
//
// `naBarra: false` fica so no computador: a barra do celular aguenta cinco
// abas com alvo de toque confortavel; na sexta cada uma fica estreita demais.
// Notificacoes saiu da barra do celular: o sino fixo no canto da tela ja avisa
// de qualquer pagina, e a vaga liberada foi para Membros, que e onde o membro
// descobre quem mais esta aqui. No computador o item continua na lista.
const principais = [
  { href: "/socio/comunidade", label: "Feed", curto: "Feed", Icon: Sparkles, naBarra: true },
  { href: "/socio/comunidade/cursos", label: "Cursos", curto: "Cursos", Icon: GraduationCap, naBarra: true },
  { href: "/socio/comunidade/membros", label: "Membros", curto: "Membros", Icon: Users, naBarra: true },
  { href: "/socio/comunidade/favoritos", label: "Favoritos", curto: "Salvos", Icon: Bookmark, naBarra: true },
  { href: "/socio/comunidade/perfil", label: "Meu perfil", curto: "Perfil", Icon: UserRound, naBarra: true },
  { href: "/socio/comunidade/notificacoes", label: "Notificacoes", curto: "Avisos", Icon: Bell, naBarra: false },
  { href: "/socio/comunidade/eventos", label: "Eventos & Encontros", curto: "Eventos", Icon: CalendarClock, naBarra: false },
] as const;

export function CommunitySidebar({
  groups,
  unread = 0,
}: {
  groups: CommunityGroupWithSpaces[];
  unread?: number;
}) {
  const pathname = usePathname();
  // No computador a lista fica aberta; no celular comeca fechada, senao ela
  // empurra o conteudo para fora da primeira tela. Comeca `true` para o HTML
  // do servidor bater com o do cliente, e o efeito ajusta depois.
  const [espacosAbertos, setEspacosAbertos] = useState(true);

  useEffect(() => {
    const consulta = window.matchMedia("(max-width: 820px)");
    const aplicar = () => setEspacosAbertos(!consulta.matches);
    aplicar();
    consulta.addEventListener("change", aplicar);
    return () => consulta.removeEventListener("change", aplicar);
  }, []);

  const espacoAtivo = groups
    .flatMap((group) => group.spaces)
    .find((space) => pathname.startsWith(`/socio/comunidade/${space.slug}`));

  return (
    <nav className="community-nav">
      <div className="community-nav-primary">
        {principais.map(({ href, label, curto, Icon, naBarra }) => {
          const active = pathname === href;
          const classes = [
            "community-nav-feed",
            active ? "active" : "",
            naBarra ? "" : "so-no-computador",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <Link className={classes} href={href} key={href}>
              <Icon size={16} />
              <span className="community-nav-label">{label}</span>
              <span className="community-nav-label-curto">{curto}</span>
              {href.endsWith("/notificacoes") && unread > 0 ? (
                <span className="community-nav-badge">{unread > 99 ? "99+" : unread}</span>
              ) : null}
            </Link>
          );
        })}
      </div>

      {/* No celular a lista de espacos sai do caminho e vira um seletor que abre
          sob demanda: sem isso, seria preciso rolar a lista inteira antes de
          chegar ao conteudo. No computador o <details> fica sempre aberto. */}
      <details className="community-nav-spaces" open={espacosAbertos}>
        <summary>
          <LayoutGrid size={15} />
          <span>{espacoAtivo ? espacoAtivo.name : "Espacos"}</span>
        </summary>

        <div className="community-nav-spaces-body">
          {groups.map((group) => (
            <section key={group.id} className="community-nav-group">
              <p>{group.name}</p>
              <ul>
                {group.spaces.map((space) => {
                  const Icon = kindIcon[space.kind as keyof typeof kindIcon] ?? MessagesSquare;
                  const href = `/socio/comunidade/${space.slug}`;
                  const active = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <li key={space.id}>
                      <Link className={active ? "active" : undefined} href={href}>
                        {/* O emoji que o admin escolheu substitui o icone do
                            tipo: e o que torna a lateral reconhecivel de
                            relance. Sem emoji, cai no icone de sempre. */}
                        {space.emoji ? (
                          <span className="community-nav-emoji">{space.emoji}</span>
                        ) : (
                          <Icon size={15} />
                        )}
                        <span>{space.name}</span>
                        {/* Espaco travado ou agendado continua clicavel: a
                            pagina dele e que explica o que falta e leva ao
                            pagamento. Aqui vai so o sinal. */}
                        {space.bloqueio ? (
                          <em
                            className="community-nav-lock"
                            title={
                              space.bloqueio.tipo === "premium"
                                ? `Premium: ${space.bloqueio.texto}`
                                : `Abre em ${space.bloqueio.texto}`
                            }
                          >
                            {space.bloqueio.tipo === "premium" ? (
                              <Lock size={12} />
                            ) : (
                              <Clock size={12} />
                            )}
                          </em>
                        ) : space.post_count ? (
                          <em>{space.post_count}</em>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </details>
    </nav>
  );
}
