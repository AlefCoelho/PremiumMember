"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAffiliate } from "@/lib/auth";
import { containsExternalLink, getMemberEligibleSales } from "@/lib/community";
import {
  memberCanOpenLesson,
  createLessonComment,
  getLessonBySlug,
  setLessonCompleted,
  toggleLessonFavorite,
} from "@/lib/lessons";

export async function toggleLessonDoneAction(formData: FormData) {
  const session = await requireAffiliate();
  const slug = String(formData.get("slug") ?? "").trim();
  const entry = slug ? getLessonBySlug(slug) : undefined;
  if (!entry) throw new Error("Aula nao encontrada.");

  // Mesma regra do conteudo: aula travada nao pode ser marcada como concluida,
  // senao o progresso do membro andaria sem ele assistir nada.
  if (!memberCanOpenLesson(entry, session.affiliateId, getMemberEligibleSales(session.affiliateId))) {
    throw new Error("Esta aula ainda nao esta liberada para voce.");
  }

  const completed = String(formData.get("completed") ?? "") === "1";
  setLessonCompleted(entry.lesson.id, session.affiliateId, completed);

  revalidatePath(`/socio/comunidade/${entry.spaceSlug}`);
  revalidatePath("/socio/comunidade/cursos");
  revalidatePath(`/socio/aula/${slug}`);
  redirect(`/socio/aula/${slug}`);
}

export async function toggleLessonFavoriteAction(formData: FormData) {
  const session = await requireAffiliate();
  const slug = String(formData.get("slug") ?? "").trim();
  const entry = slug ? getLessonBySlug(slug) : undefined;
  if (!entry) throw new Error("Aula nao encontrada.");

  if (!memberCanOpenLesson(entry, session.affiliateId, getMemberEligibleSales(session.affiliateId))) {
    throw new Error("Esta aula ainda nao esta liberada para voce.");
  }

  toggleLessonFavorite(entry.lesson.id, session.affiliateId);

  revalidatePath("/socio/comunidade/favoritos");
  revalidatePath(`/socio/aula/${slug}`);
  redirect(`/socio/aula/${slug}`);
}

export async function createLessonCommentAction(formData: FormData) {
  const session = await requireAffiliate();
  const slug = String(formData.get("slug") ?? "").trim();
  const entry = slug ? getLessonBySlug(slug) : undefined;
  if (!entry) throw new Error("Aula nao encontrada.");

  if (!memberCanOpenLesson(entry, session.affiliateId, getMemberEligibleSales(session.affiliateId))) {
    throw new Error("Esta aula ainda nao esta liberada para voce.");
  }

  const body = String(formData.get("body") ?? "").trim().slice(0, 2000);
  if (!body) redirect(`/socio/aula/${slug}`);

  // Mesma regra do feed: nenhum membro compartilha link externo, nem aqui.
  if (containsExternalLink(body)) {
    redirect(`/socio/aula/${slug}?erro=link`);
  }

  createLessonComment({
    lessonId: entry.lesson.id,
    authorType: "member",
    authorId: session.affiliateId,
    body,
  });

  revalidatePath(`/socio/aula/${slug}`);
  redirect(`/socio/aula/${slug}#comentarios`);
}
