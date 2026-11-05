import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Clock,
  FileDown,
  Lock,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  createLessonCommentAction,
  toggleLessonDoneAction,
  toggleLessonFavoriteAction,
} from "@/app/socio/aula/[slug]/actions";
import { LessonRail } from "@/components/LessonRail";
import { requireAffiliate } from "@/lib/auth";
import { getMemberEligibleSales } from "@/lib/community";
import {
  canOpenLesson,
  memberCanOpenLesson,
  getLessonBySlug,
  getLessonMaterials,
  getLessonPresentationMap,
  getMemberCourse,
  getLessonComments,
  getNextLesson,
  isLessonCompleted,
  isLessonFavorite,
  requiredSalesFor,
} from "@/lib/lessons";

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const session = await requireAffiliate();
  const { slug } = await params;
  const { erro } = await searchParams;

  const entry = getLessonBySlug(slug);
  if (!entry) notFound();

  const eligibleSales = getMemberEligibleSales(session.affiliateId);
  const voltar = `/socio/comunidade/${entry.spaceSlug}`;

  // Travamento premium e liberacao programada sao do espaco, nao da aula: quem
  // chega pelo endereco direto volta para a pagina do espaco, que e onde o
  // motivo certo e o botao de pagamento estao. Repetir aquela tela aqui seria
  // manter duas versoes do mesmo texto.
  if (!memberCanOpenLesson(entry, session.affiliateId, eligibleSales) && canOpenLesson(entry, eligibleSales)) {
    redirect(voltar);
  }

  if (!canOpenLesson(entry, eligibleSales)) {
    const exigido = requiredSalesFor(entry);
    return (
      <main className="lesson-shell">
        <header className="lesson-topbar">
          <Link className="lesson-topbar-back" href={voltar}>
            <ArrowLeft size={16} />
            {entry.spaceName}
          </Link>
        </header>

        <div className="lesson-locked">
          <Lock size={26} />
          <h1>{entry.lesson.title}</h1>
          <p>
            Esta aula libera com {exigido} venda(s) liberada(s). Voce tem {eligibleSales}.
            {exigido - eligibleSales > 0 ? ` Faltam ${exigido - eligibleSales}.` : ""}
          </p>
          <Link className="primary-button" href="/socio/ganhos">
            Ver minhas indicacoes
          </Link>
        </div>
      </main>
    );
  }

  const materials = getLessonMaterials(entry.lesson.id);
  const completed = isLessonCompleted(entry.lesson.id, session.affiliateId);
  const favorito = isLessonFavorite(entry.lesson.id, session.affiliateId);
  const comentarios = getLessonComments(entry.lesson.id);
  const next = getNextLesson(entry);

  // O trilho do lado mostra o curso inteiro, para o membro nao precisar voltar
  // a pagina do curso so para saber onde esta.
  const course = getMemberCourse(entry.spaceId, session.affiliateId, eligibleSales);
  const presentation = getLessonPresentationMap(
    course.modules.flatMap((modulo) => modulo.lessons.map((aula) => aula.id))
  );

  return (
    <main className="lesson-shell">
      <header className="lesson-topbar">
        <Link className="lesson-topbar-back" href={voltar}>
          <ArrowLeft size={16} />
          <span>{entry.spaceName}</span>
        </Link>

        <div className="lesson-topbar-actions">
          <form action={toggleLessonFavoriteAction}>
            <input type="hidden" name="slug" value={slug} />
            <button
              className={favorito ? "ghost-button ativo" : "ghost-button"}
              type="submit"
              title={favorito ? "Tirar dos salvos" : "Salvar aula"}
            >
              <Bookmark size={16} fill={favorito ? "currentColor" : "none"} />
            </button>
          </form>
          {next ? (
            <Link className="ghost-button" href={`/socio/aula/${next.slug}`} title="Proxima aula">
              <ArrowRight size={16} />
            </Link>
          ) : null}
          <form action={toggleLessonDoneAction}>
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="completed" value={completed ? "0" : "1"} />
            <button className={completed ? "outline-button" : "primary-button"} type="submit">
              <CheckCircle2 size={15} />
              {completed ? "Concluida" : "Marcar concluida"}
            </button>
          </form>
        </div>
      </header>

      <div className="lesson-layout">
        <LessonRail
          modules={course.modules}
          currentLessonId={entry.lesson.id}
          completed={course.completed}
          total={course.total}
          presentation={Object.fromEntries(presentation)}
        />

        <article className="lesson-content">
          {entry.lesson.video_provider === "youtube" && entry.lesson.video_id ? (
            <div className="lesson-player">
              {/* `youtube-nocookie` nao planta cookie de rastreio antes do play;
                  `rel=0` evita o YouTube sugerir video de fora da plataforma. */}
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${entry.lesson.video_id}?rel=0&modestbranding=1`}
                title={entry.lesson.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
              />
            </div>
          ) : null}

          <p className="eyebrow">{entry.moduleTitle}</p>
          <h1>{entry.lesson.title}</h1>
          {entry.lesson.duration_minutes ? (
            <p className="muted lesson-duration">
              <Clock size={13} /> {entry.lesson.duration_minutes} min
            </p>
          ) : null}

          {entry.lesson.body ? (
            <div className="lesson-body">
              {/* O navegador manda CRLF no textarea, entao normalizar antes de
                  separar: /\n{2,}/ sozinho nunca casa com "\r\n\r\n" e o texto
                  inteiro virava um paragrafo so. */}
              {entry.lesson.body
                .replace(/\r\n/g, "\n")
                .split(/\n{2,}/)
                .map((paragrafo, index) => (
                  <p key={index}>{paragrafo}</p>
                ))}
            </div>
          ) : null}

          {materials.length ? (
            <section className="lesson-materials">
              <h2>Material da aula</h2>
              <ul>
                {materials.map((material) => (
                  <li key={material.id}>
                    <a href={`/materiais/${material.id}`}>
                      <FileDown size={16} />
                      <span>{material.label}</span>
                    </a>
                    <span className="muted">{formatSize(material.size_bytes)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <footer className="lesson-footer">
            <form action={toggleLessonDoneAction}>
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="completed" value={completed ? "0" : "1"} />
              <button className={completed ? "outline-button" : "primary-button"} type="submit">
                <CheckCircle2 size={16} />
                {completed ? "Marcar como nao concluida" : "Marcar como concluida"}
              </button>
            </form>

            {next ? (
              <Link className="outline-button" href={`/socio/aula/${next.slug}`}>
                Proxima: {next.title}
                <ArrowRight size={16} />
              </Link>
            ) : (
              <p className="muted">Esta e a ultima aula do curso.</p>
            )}
          </footer>

          <section className="lesson-comments" id="comentarios">
            <h2>
              <MessageSquare size={16} />
              Comentarios
              {comentarios.length ? <span className="muted">{comentarios.length}</span> : null}
            </h2>

            {comentarios.length ? (
              <ul>
                {comentarios.map((comentario) => (
                  <li key={comentario.id}>
                    <strong>{comentario.author_name}</strong>
                    <p>{comentario.body}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Nenhum comentario nesta aula ainda. Comece a conversa.</p>
            )}

            <form action={createLessonCommentAction} className="stack">
              <input type="hidden" name="slug" value={slug} />
              <label className="sr-only" htmlFor="comentario-aula">
                Seu comentario
              </label>
              <textarea
                id="comentario-aula"
                name="body"
                rows={3}
                maxLength={2000}
                placeholder="Duvida ou comentario sobre esta aula"
                required
              />
              {erro === "link" ? (
                <p className="form-error">
                  Link externo nao e permitido na comunidade. Tire o endereco e envie de novo.
                </p>
              ) : null}
              <button className="outline-button" type="submit">
                Comentar
              </button>
            </form>
          </section>
        </article>
      </div>
    </main>
  );
}
