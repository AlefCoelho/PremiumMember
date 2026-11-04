import { db } from "@/lib/db";

// Tabelas novas, no mesmo padrao aditivo do resto da comunidade.
db.exec(`
CREATE TABLE IF NOT EXISTS community_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  starts_at TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  meet_url TEXT NOT NULL DEFAULT '',
  recording_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS community_event_rsvps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES community_events(id) ON DELETE CASCADE,
  affiliate_id INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (event_id, affiliate_id)
);

CREATE INDEX IF NOT EXISTS idx_community_events_start ON community_events(starts_at);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_event ON community_event_rsvps(event_id);
`);

export type CommunityEvent = {
  id: number;
  title: string;
  description: string;
  starts_at: string;
  duration_minutes: number;
  meet_url: string;
  recording_url: string;
  status: string;
  rsvp_count: number;
};

export type CommunityEventWithRsvp = CommunityEvent & { confirmed: boolean };

const eventSelect = `
  SELECT community_events.*,
         (
           SELECT COUNT(*) FROM community_event_rsvps
           WHERE community_event_rsvps.event_id = community_events.id
         ) AS rsvp_count
  FROM community_events
`;

// A live continua "acontecendo" ate a duracao acabar, com 15 minutos de folga:
// quem chega atrasado ainda encontra o botao de entrar.
const GRACE_MINUTES = 15;

export function eventEndsAt(event: Pick<CommunityEvent, "starts_at" | "duration_minutes">) {
  return new Date(
    new Date(event.starts_at).getTime() + (event.duration_minutes + GRACE_MINUTES) * 60_000
  );
}

export function isEventLive(event: Pick<CommunityEvent, "starts_at" | "duration_minutes" | "status">) {
  if (event.status !== "scheduled") return false;
  const now = Date.now();
  const start = new Date(event.starts_at).getTime();
  // Abre a sala 10 minutos antes, para ninguem bater na porta fechada.
  return now >= start - 10 * 60_000 && now <= eventEndsAt(event).getTime();
}

export function isEventPast(event: Pick<CommunityEvent, "starts_at" | "duration_minutes" | "status">) {
  if (event.status === "cancelled") return true;
  return Date.now() > eventEndsAt(event).getTime();
}

export function getUpcomingEvents(limit = 5): CommunityEvent[] {
  return db
    .prepare(
      `${eventSelect}
       WHERE community_events.status = 'scheduled'
         AND datetime(community_events.starts_at) >= datetime('now', '-1 day')
       ORDER BY datetime(community_events.starts_at)
       LIMIT ?`
    )
    .all(limit) as CommunityEvent[];
}

export function getPastEvents(limit = 50): CommunityEvent[] {
  return db
    .prepare(
      `${eventSelect}
       WHERE community_events.status != 'cancelled'
         AND datetime(community_events.starts_at) < datetime('now', '-1 day')
       ORDER BY datetime(community_events.starts_at) DESC
       LIMIT ?`
    )
    .all(limit) as CommunityEvent[];
}

export function getAllEvents(): CommunityEvent[] {
  return db
    .prepare(`${eventSelect} ORDER BY datetime(community_events.starts_at) DESC`)
    .all() as CommunityEvent[];
}

export function getEventById(eventId: number): CommunityEvent | undefined {
  return db
    .prepare(`${eventSelect} WHERE community_events.id = ?`)
    .get(eventId) as CommunityEvent | undefined;
}

export function attachRsvp(events: CommunityEvent[], affiliateId: number): CommunityEventWithRsvp[] {
  if (!events.length) return [];
  const ids = events.map((event) => event.id);
  const rows = db
    .prepare(
      `SELECT event_id FROM community_event_rsvps
       WHERE affiliate_id = ? AND event_id IN (${ids.map(() => "?").join(",")})`
    )
    .all(affiliateId, ...ids) as { event_id: number }[];
  const set = new Set(rows.map((row) => row.event_id));
  return events.map((event) => ({ ...event, confirmed: set.has(event.id) }));
}

// Quem confirmou presenca, para o admin saber com quem contar.
export function getEventAttendees(eventId: number) {
  return db
    .prepare(
      `SELECT affiliates.id, affiliates.name, affiliates.email, community_event_rsvps.created_at
       FROM community_event_rsvps
       JOIN affiliates ON affiliates.id = community_event_rsvps.affiliate_id
       WHERE community_event_rsvps.event_id = ?
       ORDER BY community_event_rsvps.created_at`
    )
    .all(eventId) as { id: number; name: string; email: string; created_at: string }[];
}

export function createEvent(input: {
  title: string;
  description: string;
  startsAt: string;
  durationMinutes: number;
  meetUrl: string;
}) {
  const result = db
    .prepare(
      `INSERT INTO community_events (title, description, starts_at, duration_minutes, meet_url)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(input.title, input.description, input.startsAt, input.durationMinutes, input.meetUrl);
  return Number(result.lastInsertRowid);
}

export function updateEvent(
  eventId: number,
  input: {
    title: string;
    description: string;
    startsAt: string;
    durationMinutes: number;
    meetUrl: string;
    recordingUrl: string;
  }
) {
  db.prepare(
    `UPDATE community_events
     SET title = ?, description = ?, starts_at = ?, duration_minutes = ?, meet_url = ?, recording_url = ?
     WHERE id = ?`
  ).run(
    input.title,
    input.description,
    input.startsAt,
    input.durationMinutes,
    input.meetUrl,
    input.recordingUrl,
    eventId
  );
}

export function setEventStatus(eventId: number, status: "scheduled" | "cancelled") {
  db.prepare("UPDATE community_events SET status = ? WHERE id = ?").run(status, eventId);
}

export function toggleRsvp(eventId: number, affiliateId: number) {
  const existing = db
    .prepare("SELECT id FROM community_event_rsvps WHERE event_id = ? AND affiliate_id = ?")
    .get(eventId, affiliateId) as { id: number } | undefined;

  if (existing) {
    db.prepare("DELETE FROM community_event_rsvps WHERE id = ?").run(existing.id);
    return false;
  }

  db.prepare("INSERT INTO community_event_rsvps (event_id, affiliate_id) VALUES (?, ?)").run(
    eventId,
    affiliateId
  );
  return true;
}

export function formatEventDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function eventDayParts(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { day: "--", month: "--", time: "--" };
  return {
    day: new Intl.DateTimeFormat("pt-BR", { day: "2-digit" }).format(date),
    month: new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(date).replace(".", ""),
    time: new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date),
  };
}
