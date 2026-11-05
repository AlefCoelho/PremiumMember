import { GraduationCap, Lock } from "lucide-react";
import Link from "next/link";
import { requireAffiliate } from "@/lib/auth";
import { getMemberEligibleSales } from "@/lib/community";
import { getCourseGallery } from "@/lib/lessons";
import { publicUrl } from "@/lib/storage";

export default async function CoursesGalleryPage() {
  const session = await requireAffiliate();
  const eligibleSales = getMemberEligibleSales(session.affiliateId);
  const courses = getCourseGallery(session.affiliateId, eligibleSales);

  // Curso em destaque vem primeiro; o resto mantem a ordem do painel.
  const ordenados = [...courses].sort((a, b) => b.featured - a.featured);
  const emAndamento = ordenados.filter((item) => item.unlocked && item.completed > 0);

  return (
    <>
      <header className="community-header">
        <div>
          <p className="eyebrow">Aulas</p>
          <h1>Cursos</h1>
          <p>
            {courses.length
              ? `${courses.length} curso(s) disponivel(is) na sua area de membro.`
              : "Os cursos aparecem aqui assim que forem publicados."}
          </p>
        </div>
      </header>

      {emAndamento.length ? (
        <section className="panel course-continue">
          <strong>Continue de onde parou</strong>
          <div className="course-continue-row">
            {emAndamento.map((curso) => (
              <Link href={`/socio/comunidade/${curso.slug}`} key={curso.id}>
                {curso.emoji ? <span>{curso.emoji}</span> : <GraduationCap size={15} />}
                {curso.name}
                <em>{curso.percent}%</em>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {courses.length === 0 ? (
        <div className="panel community-empty">
          <GraduationCap size={22} />
          <strong>Nenhum curso publicado ainda.</strong>
          <p>Assim que o primeiro curso entrar no ar, ele aparece nesta pagina.</p>
        </div>
      ) : (
        <div className="course-gallery">
          {ordenados.map((curso) => {
            const capa = publicUrl(curso.cover_path);
            const faltam = curso.min_eligible_sales - eligibleSales;

            // Curso travado aparece na vitrine, fechado: o membro precisa ver
            // o que ganha ao vender, senao nao tem por que vender.
            const conteudo = (
              <>
                {capa ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={capa} alt="" />
                ) : (
                  <div className="course-card-cover-vazia">
                    {curso.emoji || <GraduationCap size={26} />}
                  </div>
                )}

                <div className="course-card-body">
                  {curso.unlocked ? (
                    <>
                      <div
                        className="course-bar"
                        role="img"
                        aria-label={`${curso.percent}% concluido`}
                      >
                        <span style={{ width: `${curso.percent}%` }} />
                      </div>
                      <span className="course-card-percent">{curso.percent}% completo</span>
                    </>
                  ) : (
                    <span className="course-card-locked">
                      <Lock size={13} />
                      {curso.min_eligible_sales} venda(s)
                      {faltam > 0 ? ` - faltam ${faltam}` : ""}
                    </span>
                  )}

                  <strong>
                    {curso.emoji ? `${curso.emoji} ` : ""}
                    {curso.name}
                  </strong>
                  <span className="muted">{curso.group_name}</span>
                  {curso.headline ? <p className="muted">{curso.headline}</p> : null}
                  {curso.unlocked && curso.total ? (
                    <span className="muted">
                      {curso.completed} de {curso.total} aula(s)
                    </span>
                  ) : null}
                </div>
              </>
            );

            if (!curso.unlocked) {
              return (
                <article className="course-card locked" key={curso.id}>
                  {conteudo}
                </article>
              );
            }

            return (
              <Link className="course-card" href={`/socio/comunidade/${curso.slug}`} key={curso.id}>
                {conteudo}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
