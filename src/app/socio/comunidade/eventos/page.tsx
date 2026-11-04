import { toggleEventRsvpAction } from "@/app/socio/comunidade/actions";
import { requireAffiliate } from "@/lib/auth";
import {
  attachRsvp,
  eventDayParts,
  formatEventDate,
  getPastEvents,
  getUpcomingEvents,
  isEventLive,
  type CommunityEventWithRsvp,
} from "@/lib/events";
import { CalendarClock, CheckCircle2, PlayCircle, Video } from "lucide-react";

function EventCard({ event }: { event: CommunityEventWithRsvp }) {
  const parts = eventDayParts(event.starts_at);
  const live = isEventLive(event);

  return (
    <article className="community-event-card">
      <div className="community-event-date">
        <strong>{parts.day}</strong>
        <span>{parts.month}</span>
      </div>

      <div className="community-event-body">
        <h3>{event.title}</h3>
        <p className="muted">
          {formatEventDate(event.starts_at)} - {event.duration_minutes} min -{" "}
          {event.rsvp_count === 1 ? "1 confirmado" : `${event.rsvp_count} confirmados`}
        </p>
        {event.description ? <p>{event.description}</p> : null}

        <div className="community-event-actions">
          <form action={toggleEventRsvpAction}>
            <input type="hidden" name="event_id" value={event.id} />
            <button className={event.confirmed ? "primary-button" : "outline-button"} type="submit">
              <CheckCircle2 size={15} />
              {event.confirmed ? "Presenca confirmada" : "Confirmar presenca"}
            </button>
          </form>

          {live && event.meet_url ? (
            <a className="primary-button" href={event.meet_url} target="_blank" rel="noreferrer">
              <Video size={15} />
              Entrar na live
            </a>
          ) : null}
        </div>

        {!live && event.meet_url ? (
          <p className="muted">O botao de entrar abre 10 minutos antes do comeco.</p>
        ) : null}
      </div>
    </article>
  );
}

export default async function CommunityEventsPage() {
  const session = await requireAffiliate();
  const upcoming = attachRsvp(getUpcomingEvents(20), session.affiliateId);
  const past = getPastEvents();

  return (
    <>
      <header className="community-header">
        <div>
          <p className="eyebrow">Comunidade</p>
          <h1>Eventos &amp; Encontros</h1>
          <p>As proximas lives e tudo que ja aconteceu, com gravacao quando houver.</p>
        </div>
      </header>

      <section className="community-feed">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Proximos</h2>
              <p>Confirme presenca para o anfitriao saber com quem contar.</p>
            </div>
            <CalendarClock size={18} />
          </div>

          {upcoming.length ? (
            <div className="community-event-list">
              {upcoming.map((event) => (
                <EventCard event={event} key={event.id} />
              ))}
            </div>
          ) : (
            <p className="muted">Nenhuma live agendada no momento.</p>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Gravados</h2>
              <p>Encontros que ja aconteceram.</p>
            </div>
            <PlayCircle size={18} />
          </div>

          {past.length ? (
            <div className="community-event-list">
              {past.map((event) => {
                const parts = eventDayParts(event.starts_at);
                return (
                  <article className="community-event-card" key={event.id}>
                    <div className="community-event-date">
                      <strong>{parts.day}</strong>
                      <span>{parts.month}</span>
                    </div>
                    <div className="community-event-body">
                      <h3>{event.title}</h3>
                      <p className="muted">
                        {formatEventDate(event.starts_at)} - {event.rsvp_count} confirmaram presenca
                      </p>
                      {event.description ? <p>{event.description}</p> : null}
                      {event.recording_url ? (
                        <div className="community-event-actions">
                          <a
                            className="outline-button"
                            href={event.recording_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <PlayCircle size={15} />
                            Assistir gravacao
                          </a>
                        </div>
                      ) : (
                        <p className="muted">Gravacao ainda nao publicada.</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="muted">Nenhum encontro gravado ainda.</p>
          )}
        </div>
      </section>
    </>
  );
}
