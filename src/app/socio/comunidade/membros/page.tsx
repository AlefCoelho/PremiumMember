import { GraduationCap, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { requireAffiliate } from "@/lib/auth";
import { formatJoinDate, getLeaderboard, getMemberDirectory } from "@/lib/directory";
import { levelFor } from "@/lib/levels";
import { getAvatarUrls, getProfileInfo } from "@/lib/profiles";

export default async function MembersPage() {
  const session = await requireAffiliate();
  const membros = getMemberDirectory();
  const ranking = getLeaderboard();
  const avatars = getAvatarUrls(membros.map((item) => item.id));

  function iniciais(nome: string) {
    return nome
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0] ?? "")
      .join("")
      .toUpperCase();
  }

  return (
    <>
      <header className="community-header">
        <div>
          <p className="eyebrow">Comunidade</p>
          <h1>Membros</h1>
          <p>
            {membros.length} membro(s) ativo(s). Toque no nome para ver o perfil, o nivel e o que a
            pessoa ja concluiu aqui dentro.
          </p>
        </div>
      </header>

      {ranking.length ? (
        <section className="panel leaderboard">
          <h2>
            <Trophy size={16} />
            Ranking
          </h2>
          <p className="muted">Por vendas liberadas. No empate, quem concluiu mais aulas.</p>

          <ol>
            {ranking.map((membro) => (
              <li className={membro.id === session.affiliateId ? "voce" : undefined} key={membro.id}>
                <span className="leaderboard-pos">{membro.position}</span>
                <div>
                  <Link href={`/socio/comunidade/membros/${membro.id}`}>
                    <strong>
                      {membro.name}
                      {membro.id === session.affiliateId ? " (voce)" : ""}
                    </strong>
                  </Link>
                  <span className="muted">
                    {levelFor(membro.eligible_referrals).nome} - {membro.eligible_referrals} venda(s)
                    - {membro.lessons_done} aula(s)
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="panel members-list">
        <h2>
          <Users size={16} />
          Todos os membros
        </h2>

        <ul>
          {membros.map((membro) => {
            const avatar = avatars.get(membro.id);
            const info = getProfileInfo(membro.id);
            const nivel = levelFor(membro.eligible_referrals);

            return (
              <li key={membro.id}>
                {/* A linha inteira e o link: num celular, alvo de toque pequeno
                    em lista longa erra mais do que acerta. */}
                <Link className="members-row" href={`/socio/comunidade/membros/${membro.id}`}>
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar} alt="" />
                  ) : (
                    <span className="members-avatar">{iniciais(membro.name)}</span>
                  )}
                  <div>
                    <strong>
                      {membro.name}
                      {membro.id === session.affiliateId ? " (voce)" : ""}
                    </strong>
                    <span className="muted">
                      {info.area ? `${info.area} - ` : ""}
                      {nivel.nome} - entrou em {formatJoinDate(membro.created_at)}
                    </span>
                  </div>
                  {membro.lessons_done ? (
                    <span className="members-badge">
                      <GraduationCap size={13} />
                      {membro.lessons_done}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
