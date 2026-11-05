import { ArrowLeft, Briefcase, CalendarDays, GraduationCap, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAffiliate } from "@/lib/auth";
import { formatJoinDate, getMemberProfile } from "@/lib/directory";
import { levelProgress, membershipLength } from "@/lib/levels";
import { getAvatarUrl } from "@/lib/profiles";

function iniciais(nome: string) {
  return nome
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0] ?? "")
    .join("")
    .toUpperCase();
}

/**
 * O perfil publico de um membro, visto por outro membro.
 *
 * Nada de e-mail, telefone, PIX ou valor em dinheiro: o que aparece e o que a
 * pessoa construiu e o que ela mesma escreveu. Mesma regra do diretorio.
 */
export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAffiliate();
  const { id } = await params;
  const affiliateId = Number(id);
  if (!Number.isInteger(affiliateId) || affiliateId <= 0) notFound();

  const membro = getMemberProfile(affiliateId);
  if (!membro) notFound();

  const avatar = getAvatarUrl(affiliateId);
  const nivel = levelProgress(membro.eligible_referrals);
  const souEu = affiliateId === session.affiliateId;

  return (
    <>
      <header className="community-header">
        <div>
          <Link className="member-profile-back" href="/socio/comunidade/membros">
            <ArrowLeft size={15} />
            Membros
          </Link>
        </div>
      </header>

      <section className={`panel member-profile nivel-${nivel.atual.cor}`}>
        <div className="member-profile-head">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="member-profile-avatar" src={avatar} alt="" />
          ) : (
            <span className="member-profile-avatar member-profile-avatar-vazio">
              {iniciais(membro.name)}
            </span>
          )}

          <div>
            <h1>{membro.name}</h1>
            <p className="member-profile-level">
              <Trophy size={14} />
              Nivel {nivel.atual.nivel} - {nivel.atual.nome}
            </p>
            {membro.area ? (
              <p className="muted">
                <Briefcase size={13} />
                {membro.area}
              </p>
            ) : null}
            <p className="muted">
              <CalendarDays size={13} />
              Membro desde {formatJoinDate(membro.created_at)} ({membershipLength(membro.created_at)})
            </p>
          </div>
        </div>

        {membro.bio ? <p className="member-profile-bio">{membro.bio}</p> : null}

        {nivel.proximo ? (
          <div className="member-profile-next">
            <div className="course-bar" role="img" aria-label={`${nivel.percent}% do proximo nivel`}>
              <span style={{ width: `${nivel.percent}%` }} />
            </div>
            <span className="muted">
              {nivel.faltam} venda(s) liberada(s) para o nivel {nivel.proximo.nivel} -{" "}
              {nivel.proximo.nome}
            </span>
          </div>
        ) : (
          <p className="muted">Nivel maximo alcancado.</p>
        )}

        <div className="member-profile-stats">
          <article>
            <GraduationCap size={16} />
            <strong>{membro.courses_done}</strong>
            <span>
              curso(s) completo(s)
              {membro.courses_total ? ` de ${membro.courses_total}` : ""}
            </span>
          </article>
          <article>
            <GraduationCap size={16} />
            <strong>{membro.lessons_done}</strong>
            <span>aula(s) concluida(s)</span>
          </article>
          <article>
            <Users size={16} />
            <strong>{membro.eligible_referrals}</strong>
            <span>venda(s) liberada(s)</span>
          </article>
        </div>

        {souEu ? (
          <Link className="outline-button" href="/socio/comunidade/perfil">
            Editar meu perfil
          </Link>
        ) : null}
      </section>
    </>
  );
}
