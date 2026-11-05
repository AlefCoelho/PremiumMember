import {
  CalendarClock,
  FileDown,
  GraduationCap,
  Image as ImageIcon,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  MessagesSquare,
  Paperclip,
  Plus,
  Youtube,
} from "lucide-react";
import Link from "next/link";
import { logoutAction } from "@/app/actions";
import {
  addMaterialAction,
  createLessonAction,
  createModuleAction,
  deleteLessonAction,
  deleteMaterialAction,
  deleteModuleAction,
  removeCourseCoverAction,
  updateSpacePresentationAction,
  updateLessonPresentationAction,
  moveLessonAction,
  moveModuleAction,
  renameModuleAction,
  setLessonStatusAction,
  setModuleStatusAction,
  updateLessonAction,
} from "@/app/admin/aulas/actions";
import { requireAdmin } from "@/lib/auth";
import {
  formatCourseDuration,
  getAdminCourse,
  getSpacePresentation,
  getCourseSummary,
  getCourseSpaces,
  getLessonMaterials,
  getLessonPresentationMap,
  lessonKinds,
  moduleStatuses,
  videoProviders,
} from "@/lib/lessons";
import { getSpaceById } from "@/lib/community";
import { MAX_MATERIAL_BYTES, publicUrl } from "@/lib/storage";
import { BrandLogo } from "@/components/BrandLogo";

const okMessages: Record<string, string> = {
  "modulo-criado": "Modulo criado.",
  "modulo-salvo": "Modulo atualizado.",
  "modulo-arquivado": "Modulo arquivado. Ele sai da trilha do membro.",
  "modulo-reativado": "Modulo reativado.",
  "modulo-excluido": "Modulo excluido, com as aulas e os materiais dele.",
  "aula-criada": "Aula criada e ja visivel na trilha.",
  "aula-salva": "Aula atualizada.",
  "aula-arquivada": "Aula arquivada. Ela sai da trilha do membro.",
  "aula-reativada": "Aula reativada.",
  "aula-excluida": "Aula excluida, com os materiais dela.",
  "material-anexado": "Material anexado a aula.",
  "material-removido": "Material removido.",
  "vitrine-salva": "Vitrine do curso atualizada.",
  "capa-removida": "Capa removida.",
};

const MAX_MATERIAL_MB = Math.round(MAX_MATERIAL_BYTES / (1024 * 1024));

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export default async function AdminLessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ curso?: string; ok?: string }>;
}) {
  await requireAdmin();
  const { curso, ok } = await searchParams;
  const feedback = ok ? okMessages[ok] : undefined;

  const courses = getCourseSpaces();
  const selected =
    courses.find((item) => item.id === Number(curso)) ?? courses.find((item) => item.status === "active") ?? courses[0];
  const modules = selected ? getAdminCourse(selected.id) : [];
  const moduleOptions = modules.map((item) => ({ id: item.id, title: item.title }));
  const vitrine = selected ? getSpacePresentation(selected.id) : null;
  const resumo = selected ? getCourseSummary(selected.id) : null;
  const espaco = selected ? getSpaceById(selected.id) : undefined;
  const aulaMeta = getLessonPresentationMap(
    modules.flatMap((item) => item.lessons.map((lesson) => lesson.id))
  );

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <BrandLogo legenda="Aulas" />

        <nav>
          <Link href="/">
            <LayoutDashboard size={18} />
            Painel de membros
          </Link>
          <Link href="/admin/comunidade">
            <MessagesSquare size={18} />
            Comunidade
          </Link>
          <a className="active" href="#aulas">
            <GraduationCap size={18} />
            Aulas
          </a>
          <Link href="/admin/eventos">
            <CalendarClock size={18} />
            Eventos
          </Link>
          <Link href="/admin/senhas">
            <KeyRound size={18} />
            Senhas
          </Link>
        </nav>

        <form action={logoutAction} className="logout-form">
          <button type="submit">
            <LogOut size={18} />
            Sair
          </button>
        </form>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>Aulas</h1>
            <p>
              Monte a trilha em modulos e aulas. O video fica no YouTube (nao listado) e o material
              de apoio fica aqui, fechado para quem nao e membro. Tudo entra no portal na hora, sem
              deploy.
            </p>
          </div>
        </header>

        {feedback ? (
          <section className="panel">
            <p className="muted">{feedback}</p>
          </section>
        ) : null}

        {courses.length === 0 ? (
          <section className="panel">
            <h2>Nenhum curso ainda</h2>
            <p className="muted">
              Um curso e um espaco do tipo <strong>Aulas</strong>. Crie um em{" "}
              <Link href="/admin/comunidade">Comunidade</Link> e ele aparece aqui para receber os
              modulos.
            </p>
          </section>
        ) : (
          <>
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2>Curso</h2>
                  <p>
                    {courses.length} curso(s). Cada um e um espaco do tipo Aulas na comunidade.
                  </p>
                </div>
                <GraduationCap size={18} />
              </div>
              <div className="course-picker">
                {courses.map((item) => (
                  <Link
                    className={
                      item.id === selected?.id ? "course-chip active" : "course-chip"
                    }
                    href={`/admin/aulas?curso=${item.id}`}
                    key={item.id}
                  >
                    <strong>{item.name}</strong>
                    <span>
                      {item.group_name}
                      {item.status === "archived" ? " - arquivado" : ""}
                      {item.min_eligible_sales > 0
                        ? ` - a partir de ${item.min_eligible_sales} venda(s)`
                        : ""}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            {selected && vitrine && resumo ? (
              <section className="panel">
                <div className="panel-header">
                  <div>
                    <h2>Vitrine do curso</h2>
                    <p>
                      {resumo.sections} secao(oes) - {resumo.lessons} aula(s)
                      {resumo.minutes ? ` - ${formatCourseDuration(resumo.minutes)}` : ""}
                    </p>
                  </div>
                  <ImageIcon size={18} />
                </div>

                <div className="course-vitrine">
                  <form action={updateSpacePresentationAction} className="stack">
                    <input type="hidden" name="space_id" value={selected.id} />
                    <div className="split-fields">
                      <label>
                        Titulo do curso
                        <input
                          name="name"
                          defaultValue={espaco?.name ?? selected.name}
                          maxLength={80}
                          required
                        />
                      </label>
                      <label>
                        Emoji
                        <input
                          name="emoji"
                          defaultValue={vitrine.emoji}
                          maxLength={8}
                          placeholder="Ex.: 🤖"
                        />
                      </label>
                    </div>
                    <label>
                      Descricao (aparece no topo do curso)
                      <textarea
                        name="description"
                        rows={2}
                        defaultValue={espaco?.description ?? ""}
                        maxLength={400}
                      />
                    </label>
                    <label>
                      Chamada da vitrine (aparece no card da galeria)
                      <input
                        name="headline"
                        defaultValue={vitrine.headline}
                        maxLength={160}
                        placeholder="Uma frase sobre o que o membro ganha aqui"
                      />
                    </label>
                    <label>
                      Capa (JPG, PNG ou WebP, ate 2 MB)
                      <input name="cover" type="file" accept="image/*" />
                    </label>
                    <label className="checkbox-field">
                      <input
                        name="featured"
                        type="checkbox"
                        value="1"
                        defaultChecked={vitrine.featured === 1}
                      />
                      Destacar este curso no topo da galeria
                    </label>
                    <button className="primary-button" type="submit">
                      Salvar vitrine
                    </button>
                  </form>

                  <div className="course-vitrine-preview">
                    <span className="muted">Como aparece na galeria</span>
                    <article className="course-card">
                      {vitrine.cover_path ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={publicUrl(vitrine.cover_path) ?? ""} alt="" />
                      ) : (
                        <div className="course-card-cover-vazia">
                          {vitrine.emoji || <ImageIcon size={22} />}
                        </div>
                      )}
                      <div className="course-card-body">
                        <div className="course-bar">
                          <span style={{ width: "40%" }} />
                        </div>
                        <strong>
                          {vitrine.emoji ? `${vitrine.emoji} ` : ""}
                          {espaco?.name ?? selected.name}
                        </strong>
                        <span className="muted">{selected.group_name}</span>
                        {vitrine.headline ? <p className="muted">{vitrine.headline}</p> : null}
                      </div>
                    </article>

                    {vitrine.cover_path ? (
                      <form action={removeCourseCoverAction}>
                        <input type="hidden" name="space_id" value={selected.id} />
                        <button className="outline-button" type="submit">
                          Remover capa
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </section>
            ) : null}

            <section className="main-grid" id="aulas">
              <div className="primary-column">
                {modules.length === 0 ? (
                  <section className="panel">
                    <p className="muted">
                      Este curso ainda nao tem modulo. Crie o primeiro ao lado: o modulo e a caixa
                      que guarda as aulas.
                    </p>
                  </section>
                ) : (
                  modules.map((modulo, index) => (
                    <section className="panel" key={modulo.id}>
                      <div className="panel-header">
                        <div>
                          <h2>
                            {modulo.title}{" "}
                            {modulo.status === "archived" ? (
                              <span className="badge neutral">Arquivado</span>
                            ) : null}
                            {modulo.status === "coming_soon" ? (
                              <span className="badge neutral">Em breve</span>
                            ) : null}
                          </h2>
                          <p>{modulo.lessons.length} aula(s)</p>
                        </div>
                        <div className="row-actions">
                          {index > 0 ? (
                            <form action={moveModuleAction}>
                              <input type="hidden" name="module_id" value={modulo.id} />
                              <input type="hidden" name="direction" value="up" />
                              <button className="ghost-button" type="submit" title="Subir modulo">
                                ↑
                              </button>
                            </form>
                          ) : null}
                          {index < modules.length - 1 ? (
                            <form action={moveModuleAction}>
                              <input type="hidden" name="module_id" value={modulo.id} />
                              <input type="hidden" name="direction" value="down" />
                              <button className="ghost-button" type="submit" title="Descer modulo">
                                ↓
                              </button>
                            </form>
                          ) : null}
                        </div>
                      </div>

                      {modulo.lessons.length === 0 ? (
                        <p className="muted">Nenhuma aula neste modulo ainda.</p>
                      ) : (
                        <div className="lesson-list">
                          {modulo.lessons.map((lesson, lessonIndex) => {
                            const materials = getLessonMaterials(lesson.id);
                            return (
                              <article className="lesson-row" key={lesson.id}>
                                <div className="lesson-row-head">
                                  <div>
                                    <strong>{lesson.title}</strong>
                                    <p className="muted">
                                      {lesson.video_provider === "youtube" ? (
                                        <>
                                          <Youtube size={13} /> video
                                        </>
                                      ) : (
                                        "sem video"
                                      )}
                                      {lesson.duration_minutes
                                        ? ` - ${lesson.duration_minutes} min`
                                        : ""}
                                      {materials.length
                                        ? ` - ${materials.length} material(is)`
                                        : ""}
                                      {lesson.min_eligible_sales > 0 ? (
                                        <>
                                          {" - "}
                                          <Lock size={12} /> {lesson.min_eligible_sales} venda(s)
                                        </>
                                      ) : null}
                                      {lesson.status === "archived" ? " - arquivada" : ""}
                                    </p>
                                    <code>/socio/aula/{lesson.slug}</code>
                                  </div>
                                  <div className="row-actions">
                                    {lessonIndex > 0 ? (
                                      <form action={moveLessonAction}>
                                        <input type="hidden" name="lesson_id" value={lesson.id} />
                                        <input type="hidden" name="direction" value="up" />
                                        <button className="ghost-button" type="submit" title="Subir aula">
                                          ↑
                                        </button>
                                      </form>
                                    ) : null}
                                    {lessonIndex < modulo.lessons.length - 1 ? (
                                      <form action={moveLessonAction}>
                                        <input type="hidden" name="lesson_id" value={lesson.id} />
                                        <input type="hidden" name="direction" value="down" />
                                        <button className="ghost-button" type="submit" title="Descer aula">
                                          ↓
                                        </button>
                                      </form>
                                    ) : null}
                                  </div>
                                </div>

                                <details className="community-admin-editor">
                                  <summary>Editar aula</summary>
                                  <div className="community-admin-editor-body">
                                    <form action={updateLessonAction} className="stack">
                                      <input type="hidden" name="lesson_id" value={lesson.id} />
                                      <label>
                                        Modulo
                                        <select name="module_id" defaultValue={lesson.module_id}>
                                          {moduleOptions.map((option) => (
                                            <option key={option.id} value={option.id}>
                                              {option.title}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                      <label>
                                        Titulo
                                        <input
                                          name="title"
                                          defaultValue={lesson.title}
                                          maxLength={120}
                                          required
                                        />
                                      </label>
                                      <label>
                                        Resumo (aparece na trilha)
                                        <textarea
                                          name="summary"
                                          rows={2}
                                          defaultValue={lesson.summary}
                                          maxLength={300}
                                        />
                                      </label>
                                      <label>
                                        Conteudo da aula
                                        <textarea
                                          name="body"
                                          rows={6}
                                          defaultValue={lesson.body}
                                          maxLength={8000}
                                        />
                                      </label>
                                      <label>
                                        Video
                                        <select
                                          name="video_provider"
                                          defaultValue={lesson.video_provider}
                                        >
                                          {videoProviders.map((option) => (
                                            <option key={option.value} value={option.value}>
                                              {option.label}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                      <label>
                                        Link do YouTube
                                        <input
                                          name="video_url"
                                          defaultValue={lesson.video_id}
                                          placeholder="Cole o endereco do video"
                                        />
                                      </label>
                                      <div className="split-fields">
                                        <label>
                                          Duracao (min)
                                          <input
                                            name="duration_minutes"
                                            type="number"
                                            min={0}
                                            defaultValue={lesson.duration_minutes}
                                          />
                                        </label>
                                        <label>
                                          Vendas minimas
                                          <input
                                            name="min_eligible_sales"
                                            type="number"
                                            min={0}
                                            defaultValue={lesson.min_eligible_sales}
                                          />
                                        </label>
                                      </div>
                                      <button className="primary-button" type="submit">
                                        Salvar aula
                                      </button>
                                    </form>

                                    {/* Tipo e miniatura ficam em formulario
                                        proprio por causa do upload: assim o
                                        admin pode salvar o texto da aula sem
                                        reenviar a imagem toda vez. */}
                                    <form
                                      action={updateLessonPresentationAction}
                                      className="stack"
                                    >
                                      <input type="hidden" name="lesson_id" value={lesson.id} />
                                      <h3>
                                        <ImageIcon size={15} /> Como aparece na trilha
                                      </h3>
                                      <label>
                                        Tipo de aula
                                        <select
                                          name="lesson_kind"
                                          defaultValue={
                                            aulaMeta.get(lesson.id)?.kind ?? "video"
                                          }
                                        >
                                          {lessonKinds.map((option) => (
                                            <option key={option.value} value={option.value}>
                                              {option.label}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                      <label>
                                        Miniatura (ate 2 MB)
                                        <input name="thumb" type="file" accept="image/*" />
                                      </label>
                                      {aulaMeta.get(lesson.id)?.thumb_path ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          className="lesson-thumb-preview"
                                          src={
                                            publicUrl(aulaMeta.get(lesson.id)?.thumb_path) ?? ""
                                          }
                                          alt=""
                                        />
                                      ) : null}
                                      <button className="outline-button" type="submit">
                                        Salvar aparencia
                                      </button>
                                    </form>

                                    <div className="stack">
                                      <h3>
                                        <Paperclip size={15} /> Materiais
                                      </h3>
                                      {materials.length ? (
                                        <ul className="material-list">
                                          {materials.map((material) => (
                                            <li key={material.id}>
                                              <a href={`/materiais/${material.id}`}>
                                                <FileDown size={14} />
                                                {material.label}
                                              </a>
                                              <span className="muted">
                                                {formatSize(material.size_bytes)}
                                              </span>
                                              <form action={deleteMaterialAction}>
                                                <input
                                                  type="hidden"
                                                  name="material_id"
                                                  value={material.id}
                                                />
                                                <button className="ghost-button" type="submit">
                                                  Remover
                                                </button>
                                              </form>
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p className="muted">Nenhum material nesta aula.</p>
                                      )}

                                      <form action={addMaterialAction} className="stack">
                                        <input type="hidden" name="lesson_id" value={lesson.id} />
                                        <label>
                                          Arquivo (ate {MAX_MATERIAL_MB} MB)
                                          <input name="file" type="file" required />
                                        </label>
                                        <label>
                                          Nome que o membro ve
                                          <input
                                            name="label"
                                            maxLength={120}
                                            placeholder="Em branco usa o nome do arquivo"
                                          />
                                        </label>
                                        <button className="outline-button" type="submit">
                                          Anexar material
                                        </button>
                                      </form>
                                    </div>

                                    <form action={setLessonStatusAction} className="stack">
                                      <input type="hidden" name="lesson_id" value={lesson.id} />
                                      <input
                                        type="hidden"
                                        name="status"
                                        value={lesson.status === "archived" ? "active" : "archived"}
                                      />
                                      <button className="outline-button" type="submit">
                                        {lesson.status === "archived"
                                          ? "Reativar aula"
                                          : "Arquivar aula"}
                                      </button>
                                    </form>

                                    <form action={deleteLessonAction} className="stack danger-form">
                                      <input type="hidden" name="lesson_id" value={lesson.id} />
                                      <label>
                                        Excluir de vez: digite EXCLUIR
                                        <input name="confirm" placeholder="EXCLUIR" />
                                      </label>
                                      <p className="muted">
                                        Leva os materiais e o progresso dos membros junto. Arquivar
                                        e reversivel; excluir nao.
                                      </p>
                                      <button className="danger-button" type="submit">
                                        Excluir aula
                                      </button>
                                    </form>
                                  </div>
                                </details>
                              </article>
                            );
                          })}
                        </div>
                      )}

                      <details className="community-admin-editor">
                        <summary>Nova aula neste modulo</summary>
                        <div className="community-admin-editor-body">
                          <form action={createLessonAction} className="stack">
                            <input type="hidden" name="module_id" value={modulo.id} />
                            <label>
                              Titulo
                              <input
                                name="title"
                                placeholder="Ex.: Como instalar o primeiro agente"
                                maxLength={120}
                                required
                              />
                            </label>
                            <label>
                              Resumo
                              <textarea name="summary" rows={2} maxLength={300} />
                            </label>
                            <label>
                              Conteudo da aula
                              <textarea name="body" rows={5} maxLength={8000} />
                            </label>
                            <label>
                              Video
                              <select name="video_provider" defaultValue="youtube">
                                {videoProviders.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Link do YouTube
                              <input
                                name="video_url"
                                placeholder="https://www.youtube.com/watch?v=..."
                              />
                            </label>
                            <div className="split-fields">
                              <label>
                                Duracao (min)
                                <input name="duration_minutes" type="number" min={0} defaultValue={0} />
                              </label>
                              <label>
                                Vendas minimas
                                <input
                                  name="min_eligible_sales"
                                  type="number"
                                  min={0}
                                  defaultValue={0}
                                />
                              </label>
                            </div>
                            <button className="primary-button" type="submit">
                              Criar aula
                            </button>
                          </form>
                        </div>
                      </details>

                      <details className="community-admin-editor">
                        <summary>Editar modulo</summary>
                        <div className="community-admin-editor-body">
                          <form action={renameModuleAction} className="stack">
                            <input type="hidden" name="module_id" value={modulo.id} />
                            <label>
                              Nome do modulo
                              <input name="title" defaultValue={modulo.title} maxLength={90} required />
                            </label>
                            <button className="primary-button" type="submit">
                              Salvar modulo
                            </button>
                          </form>

                          <form action={setModuleStatusAction} className="stack">
                            <input type="hidden" name="module_id" value={modulo.id} />
                            <label>
                              Situacao
                              <select name="status" defaultValue={modulo.status}>
                                {moduleStatuses.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <p className="muted">
                              Em breve mostra o nome do modulo na trilha, fechado e sem aula.
                              Serve para anunciar o que vem.
                            </p>
                            <button className="outline-button" type="submit">
                              Salvar situacao
                            </button>
                          </form>

                          <form action={deleteModuleAction} className="stack danger-form">
                            <input type="hidden" name="module_id" value={modulo.id} />
                            <label>
                              Excluir de vez: digite EXCLUIR
                              <input name="confirm" placeholder="EXCLUIR" />
                            </label>
                            <p className="muted">
                              Leva as aulas, os materiais e o progresso dos membros junto.
                            </p>
                            <button className="danger-button" type="submit">
                              Excluir modulo
                            </button>
                          </form>
                        </div>
                      </details>
                    </section>
                  ))
                )}
              </div>

              <aside className="side-column">
                <section className="panel form-panel">
                  <div className="panel-header">
                    <h2>Novo modulo</h2>
                    <Plus size={18} />
                  </div>
                  <form action={createModuleAction} className="stack">
                    <input type="hidden" name="space_id" value={selected?.id ?? 0} />
                    <label>
                      Nome
                      <input
                        name="title"
                        placeholder="Ex.: Modulo 1 - Fundamentos"
                        maxLength={90}
                        required
                      />
                    </label>
                    <p className="muted">
                      A ordem dos modulos aqui e a ordem da trilha do membro.
                    </p>
                    <button className="primary-button" type="submit">
                      Criar modulo
                    </button>
                  </form>
                </section>

                <section className="panel">
                  <div className="panel-header">
                    <h2>Como funciona</h2>
                    <Youtube size={18} />
                  </div>
                  <p className="muted">
                    Suba o video no YouTube como <strong>nao listado</strong> e cole o endereco no
                    campo da aula. O player abre dentro do portal; o membro nao sai da plataforma.
                  </p>
                  <p className="muted">
                    Material de apoio (PDF, planilha, ZIP) ate {MAX_MATERIAL_MB} MB por arquivo. O
                    download exige login e respeita as vendas minimas da aula.
                  </p>
                  <p className="muted">
                    Renomear uma aula <strong>nao muda o endereco dela</strong>: link ja divulgado
                    continua funcionando.
                  </p>
                </section>
              </aside>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
