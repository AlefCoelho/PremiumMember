"use client";

import type { CommunityGroupWithSpaces } from "@/lib/community";
import {
  Bookmark,
  CalendarClock,
  GraduationCap,
  LifeBuoy,
  MessagesSquare,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const kindIcon = {
  posts: MessagesSquare,
  support: LifeBuoy,
  lessons: GraduationCap,
} as const;

export function CommunitySidebar({ groups }: { groups: CommunityGroupWithSpaces[] }) {
  const pathname = usePathname();

  return (
    <nav className="community-nav">
      <Link className={pathname === "/socio/comunidade" ? "community-nav-feed active" : "community-nav-feed"} href="/socio/comunidade">
        <Sparkles size={16} />
        Feed
      </Link>

      <Link
        className={pathname === "/socio/comunidade/favoritos" ? "community-nav-feed active" : "community-nav-feed"}
        href="/socio/comunidade/favoritos"
      >
        <Bookmark size={16} />
        Favoritos
      </Link>

      <Link
        className={pathname === "/socio/comunidade/eventos" ? "community-nav-feed active" : "community-nav-feed"}
        href="/socio/comunidade/eventos"
      >
        <CalendarClock size={16} />
        Eventos &amp; Encontros
      </Link>

      <Link
        className={pathname === "/socio/comunidade/perfil" ? "community-nav-feed active" : "community-nav-feed"}
        href="/socio/comunidade/perfil"
      >
        <UserRound size={16} />
        Meu perfil
      </Link>

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
                    <Icon size={15} />
                    <span>{space.name}</span>
                    {space.post_count ? <em>{space.post_count}</em> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}
