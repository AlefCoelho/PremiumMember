import { CheckCircle2, Circle, Clock, FileDown, Lock, PlayCircle } from "lucide-react";
import Link from "next/link";
import type { CourseSummary, LessonPresentation, MemberModule } from "@/lib/lessons";
import { formatCourseDuration } from "@/lib/lessons";
import { youtubeThumb } from "@/lib/youtube";

// A trilha do curso como o membro ve.
//
// Aula travada APARECE, fechada, dizendo quantas vendas faltam. Esconder o que
// ele ganha ao vender nao vende nada; mostrar, sim.
export function CourseTrail({
  modules,
  total,
  completed,
  eligibleSales,
  summary,
  presentation,
  comingSoon = [],
}: {
  modules: MemberModule[];
  total: number;
  completed: number;
  eligibleSales: number;
  summary: CourseSummary;
  presentation: Map<number, LessonPresentation>;
  comingSoon?: { id: number; title: string }[];
}) {
  if (total === 0 && comingSoon.length === 0) {
    return (
      <div className="panel community-empty">
        <strong>As aulas estao sendo preparadas.</strong>
        <p>Assim que a primeira aula for publicada, ela aparece aqui.</p>
      </div>
    );
  }

  const percent = Math.round((completed / total) * 100);
  // A proxima aula destravada e nao concluida: e onde o botao de continuar leva.
  const next = modules
    .flatMap((modulo) => modulo.lessons)
    .find((lesson) => lesson.unlocked && !lesson.completed);

  return (
    <>
      <section className="panel course-progress">
        <div>
          <strong>
            {completed} de {total} aula(s) concluida(s)
          </strong>
          <p className="muted">{percent}% do curso</p>
        </div>
        <div className="course-bar" role="img" aria-label={`${percent}% concluido`}>
          <span style={{ width: `${percent}%` }} />
        </div>
        {next ? (
          <Link className="primary-button" href={`/socio/aula/${next.slug}`}>
            <PlayCircle size={16} />
            {completed === 0 ? "Comecar a primeira aula" : "Continuar de onde parei"}
          </Link>
        ) : null}
      </section>

      <section className="panel course-summary">
        <strong>Conteudo</strong>
        <p className="muted">
          {summary.sections} secao(oes) - {summary.lessons} aula(s)
          {summary.minutes ? ` - ${formatCourseDuration(summary.minutes)}` : ""}
        </p>
      </section>

      <div className="course-trail">
        {modules.map((modulo, index) => {
          const done = modulo.lessons.filter((lesson) => lesson.completed).length;
          return (
            // Aberto por padrao so o primeiro modulo: no celular, tudo aberto
            // obriga a rolar a trilha inteira antes de chegar ao conteudo.
            <details className="panel course-module" key={modulo.id} open={index === 0}>
              <summary>
                <div>
                  <strong>{modulo.title}</strong>
                  <span className="muted">
                    {done}/{modulo.lessons.length} concluida(s)
                  </span>
                </div>
              </summary>

              <ul className="course-lessons">
                {modulo.lessons.map((lesson) => {
                  if (!lesson.unlocked) {
                    const faltam = lesson.min_eligible_sales - eligibleSales;
                    return (
                      <li className="course-lesson locked" key={lesson.id}>
                        <Lock size={18} />
                        <div>
                          <strong>{lesson.title}</strong>
                          <p className="muted">
                            Libera com {lesson.min_eligible_sales} venda(s) liberada(s).
                            {faltam > 0 ? ` Faltam ${faltam}.` : ""}
                          </p>
                        </div>
                      </li>
                    );
                  }

                  const meta = presentation.get(lesson.id);
                  const material = meta?.kind === "material";

                  return (
                    <li className="course-lesson" key={lesson.id}>
                      {lesson.completed ? (
                        <CheckCircle2 size={18} className="course-lesson-done" />
                      ) : (
                        <Circle size={18} />
                      )}
                      {/* A miniatura e a do proprio video no YouTube: nada
                          para o admin enviar e nada ocupando disco. */}
                      {youtubeThumb(lesson.video_provider, lesson.video_id) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          className="course-lesson-thumb"
                          src={youtubeThumb(lesson.video_provider, lesson.video_id)}
                          alt=""
                          loading="lazy"
                        />
                      ) : null}
                      <div>
                        <Link href={`/socio/aula/${lesson.slug}`}>{lesson.title}</Link>
                        {lesson.summary ? <p className="muted">{lesson.summary}</p> : null}
                      </div>
                      {lesson.duration_minutes ? (
                        <span className="course-lesson-time">
                          <Clock size={13} />
                          {lesson.duration_minutes} min
                        </span>
                      ) : material ? (
                        <span className="course-lesson-time">
                          <FileDown size={13} />
                          material
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}

        {comingSoon.map((modulo) => (
          // Anunciar o que vem segura o membro: ele ve que o curso nao acabou.
          <section className="panel course-module coming-soon" key={modulo.id}>
            <strong>{modulo.title}</strong>
            <span className="badge neutral">Em breve</span>
          </section>
        ))}
      </div>
    </>
  );
}
