"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { toggleFeatured } from "@/lib/community";
import { createEvent, getEventById, setEventStatus, updateEvent } from "@/lib/events";
import { publishNews } from "@/lib/news";

const ADMIN_PATH = "/admin/eventos";

function asText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function requireText(formData: FormData, key: string, maxLength: number) {
  const value = asText(formData, key);
  if (!value) throw new Error(`Campo obrigatorio: ${key}`);
  return value.slice(0, maxLength);
}

function requireId(formData: FormData, key: string) {
  const value = Number(asText(formData, key));
  if (!Number.isInteger(value) || value <= 0) throw new Error(`Identificador invalido: ${key}`);
  return value;
}

// O formulario manda data e hora local (datetime-local). Guardamos em ISO para
// a ordenacao por data funcionar no SQLite.
function requireStartsAt(formData: FormData) {
  const value = asText(formData, "starts_at");
  const parsed = new Date(value);
  if (!value || Number.isNaN(parsed.getTime())) throw new Error("Data e hora invalidas.");
  return parsed.toISOString();
}

function asDuration(formData: FormData) {
  const value = Number(asText(formData, "duration_minutes") || "60");
  if (!Number.isFinite(value) || value <= 0) return 60;
  return Math.min(Math.floor(value), 600);
}

// O link do Meet e colado pelo admin. Criar a sala sozinho exigiria integracao
// com a conta Google, que fica para depois.
function asMeetUrl(formData: FormData, key: string) {
  const value = asText(formData, key);
  if (!value) return "";
  try {
    const parsed = new URL(value);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("protocolo");
    return parsed.toString();
  } catch {
    throw new Error("Link invalido. Cole o endereco completo, comecando com https://");
  }
}

function revalidateEverywhere() {
  revalidatePath(ADMIN_PATH);
  revalidatePath("/socio/comunidade", "layout");
}

export async function createEventAction(formData: FormData) {
  await requireAdmin();
  const titulo = requireText(formData, "title", 160);
  createEvent({
    title: titulo,
    description: asText(formData, "description").slice(0, 2000),
    startsAt: requireStartsAt(formData),
    durationMinutes: asDuration(formData),
    meetUrl: asMeetUrl(formData, "meet_url"),
  });

  publishNews({
    kind: "evento",
    title: titulo,
    detail: "Novo encontro na agenda",
    href: "/socio/comunidade/eventos",
  });

  revalidateEverywhere();
  redirect(`${ADMIN_PATH}?ok=criado`);
}

export async function updateEventAction(formData: FormData) {
  await requireAdmin();
  const eventId = requireId(formData, "event_id");
  if (!getEventById(eventId)) throw new Error("Evento nao encontrado.");

  updateEvent(eventId, {
    title: requireText(formData, "title", 160),
    description: asText(formData, "description").slice(0, 2000),
    startsAt: requireStartsAt(formData),
    durationMinutes: asDuration(formData),
    meetUrl: asMeetUrl(formData, "meet_url"),
    recordingUrl: asMeetUrl(formData, "recording_url"),
  });

  revalidateEverywhere();
  redirect(`${ADMIN_PATH}?ok=salvo`);
}

export async function setEventStatusAction(formData: FormData) {
  await requireAdmin();
  const eventId = requireId(formData, "event_id");
  const status = asText(formData, "status");
  if (status !== "scheduled" && status !== "cancelled") throw new Error("Status invalido.");
  if (!getEventById(eventId)) throw new Error("Evento nao encontrado.");

  setEventStatus(eventId, status);
  revalidateEverywhere();
  redirect(`${ADMIN_PATH}?ok=${status === "cancelled" ? "cancelado" : "reativado"}`);
}

export async function toggleFeaturedPostAction(formData: FormData) {
  await requireAdmin();
  const postId = requireId(formData, "post_id");

  toggleFeatured(postId);
  revalidatePath("/admin/comunidade");
  revalidatePath("/socio/comunidade", "layout");
  redirect("/admin/comunidade?ok=destaque");
}
