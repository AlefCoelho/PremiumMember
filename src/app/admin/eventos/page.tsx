import { CalendarClock, GraduationCap, KeyRound, LayoutDashboard, LogOut, MessagesSquare, Plus, Users } from "lucide-react";
import Link from "next/link";
import { logoutAction } from "@/app/actions";
import {
  createEventAction,
  setEventStatusAction,
  updateEventAction,
} from "@/app/admin/eventos/actions";
import { requireAdmin } from "@/lib/auth";
import { formatEventDate, getAllEvents, getEventAttendees, isEventPast } from "@/lib/events";

const okMessages: Record<string, string> = {
  criado: "Evento criado e ja visivel para os membros.",
  salvo: "Evento atualizado.",
  cancelado: "Evento cancelado. Ele sai da lista dos membros.",
  reativado: "Evento reativado.",
};

// O input datetime-local espera hora local sem fuso.
function toLocalInput(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  await requireAdmin();
  const { ok } = await searchParams;
  const events = getAllEvents();
  const feedback = ok ? okMessages[ok] : undefined;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">PM</div>
          <div>
            <strong>Premium Member</strong>
            <span>Eventos</span>
          </div>
        </div>

        <nav>
          <Link href="/">
            <LayoutDashboard size={18} />
            Painel de membros
          </Link>
          <Link href="/admin/comunidade">
            <MessagesSquare size={18} />
            Comunidade
          </Link>
          <Link href="/admin/aulas">
            <GraduationCap size={18} />
            Aulas
          </Link>
          <a className="active" href="#eventos">
            <CalendarClock size={18} />
            Eventos
          </a>
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
            <h1>Eventos e encontros</h1>
            <p>
              Agende as lives. Quem confirmar presenca aparece aqui, e o link do Meet so abre para
              os membros perto da hora.
            </p>
          </div>
        </header>

        {feedback ? (
          <section className="panel">
            <p className="muted">{feedback}</p>
          </section>
        ) : null}

        <section className="main-grid">
          <div className="primary-column" id="eventos">
            {events.length ? (
              events.map((event) => {
                const attendees = getEventAttendees(event.id);
                const past = isEventPast(event);
                const cancelled = event.status === "cancelled";

                return (
                  <section className="panel" key={event.id}>
                    <div className="panel-header">
                      <div>
                        <h2>
                          {event.title}{" "}
                          {cancelled ? <span className="badge danger">Cancelado</span> : null}
                          {!cancelled && past ? <span className="badge neutral">Encerrado</span> : null}
                        </h2>
                        <p>
                          {formatEventDate(event.starts_at)} - {event.duration_minutes} min -{" "}
                          {event.rsvp_count} confirmacao(oes)
                        </p>
                      </div>
                      <Users size={18} />
                    </div>

                    {attendees.length ? (
                      <div className="table-wrap compact">
                        <table>
                          <thead>
                            <tr>
                              <th>Membro</th>
                              <th>Confirmou em</th>
                            </tr>
                          </thead>
                          <tbody>
                            {attendees.map((attendee) => (
                              <tr key={attendee.id}>
                                <td>
                                  <strong>{attendee.name}</strong>
                                  <span>{attendee.email}</span>
                                </td>
                                <td>{formatEventDate(attendee.created_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="muted">Ninguem confirmou presenca ainda.</p>
                    )}

                    <details className="community-admin-editor">
                      <summary>Editar evento</summary>
                      <div className="community-admin-editor-body">
                        <form action={updateEventAction} className="stack">
                          <input type="hidden" name="event_id" value={event.id} />
                          <label>
                            Titulo
                            <input name="title" defaultValue={event.title} maxLength={160} required />
                          </label>
                          <label>
                            Descricao
                            <textarea name="description" rows={3} defaultValue={event.description} />
                          </label>
                          <div className="split-fields">
                            <label>
                              Data e hora
                              <input
                                name="starts_at"
                                type="datetime-local"
                                defaultValue={toLocalInput(event.starts_at)}
                                required
                              />
                            </label>
                            <label>
                              Duracao (min)
                              <input
                                name="duration_minutes"
                                type="number"
                                min={10}
                                defaultValue={event.duration_minutes}
                              />
                            </label>
                          </div>
                          <label>
                            Link do Google Meet
                            <input
                              name="meet_url"
                              defaultValue={event.meet_url}
                              placeholder="https://meet.google.com/..."
                            />
                          </label>
                          <label>
                            Link da gravacao
                            <input
                              name="recording_url"
                              defaultValue={event.recording_url}
                              placeholder="Depois da live, cole aqui"
                            />
                          </label>
                          <button className="primary-button" type="submit">
                            Salvar evento
                          </button>
                        </form>

                        <form action={setEventStatusAction} className="stack">
                          <input type="hidden" name="event_id" value={event.id} />
                          <input
                            type="hidden"
                            name="status"
                            value={cancelled ? "scheduled" : "cancelled"}
                          />
                          <button className="outline-button" type="submit">
                            {cancelled ? "Reativar evento" : "Cancelar evento"}
                          </button>
                        </form>
                      </div>
                    </details>
                  </section>
                );
              })
            ) : (
              <section className="panel">
                <p className="muted">Nenhum evento agendado ainda. Crie o primeiro ao lado.</p>
              </section>
            )}
          </div>

          <aside className="side-column">
            <section className="panel form-panel">
              <div className="panel-header">
                <h2>Nova live</h2>
                <Plus size={18} />
              </div>
              <form action={createEventAction} className="stack">
                <label>
                  Titulo
                  <input name="title" placeholder="Ex.: Live com os Maestros" maxLength={160} required />
                </label>
                <label>
                  Descricao
                  <textarea name="description" rows={3} placeholder="Sobre o que vai ser" />
                </label>
                <label>
                  Data e hora
                  <input name="starts_at" type="datetime-local" required />
                </label>
                <label>
                  Duracao (min)
                  <input name="duration_minutes" type="number" min={10} defaultValue={60} />
                </label>
                <label>
                  Link do Google Meet
                  <input name="meet_url" placeholder="https://meet.google.com/..." />
                </label>
                <p className="muted">
                  Crie a sala no Meet e cole o link aqui. Ele aparece para o membro a partir de 10
                  minutos antes.
                </p>
                <button className="primary-button" type="submit">
                  Agendar live
                </button>
              </form>
            </section>
          </aside>
        </section>
      </section>
    </main>
  );
}
