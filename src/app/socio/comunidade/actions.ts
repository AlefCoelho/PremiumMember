"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAffiliate } from "@/lib/auth";
import {
  clearReactionNotification,
  markAllRead,
  notifyComment,
  notifyReaction,
} from "@/lib/notifications";
import {
  containsExternalLink,
  createComment,
  createPost,
  getMemberEligibleSales,
  getPostById,
  getSpaceBySlug,
  isReactionKind,
  setPostImage,
  setReaction,
  toggleFavorite,
} from "@/lib/community";
import { getEventById, toggleRsvp } from "@/lib/events";
import { removeAvatar, setAvatar } from "@/lib/profiles";
import { saveImage } from "@/lib/storage";

function asText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function requireText(formData: FormData, key: string, maxLength: number) {
  const value = asText(formData, key);
  if (!value) throw new Error(`Campo obrigatorio: ${key}`);
  return value.slice(0, maxLength);
}

export async function createCommunityPostAction(formData: FormData) {
  const session = await requireAffiliate();
  const spaceSlug = requireText(formData, "space_slug", 80);
  const title = requireText(formData, "title", 160);
  const body = requireText(formData, "body", 8000);

  // Volta para a propria pagina com um aviso, em vez de estourar tela de erro.
  if (containsExternalLink(`${title} ${body}`)) {
    redirect(`/socio/comunidade/${spaceSlug}?erro=link`);
  }

  const space = getSpaceBySlug(spaceSlug);
  if (!space) throw new Error("Espaco nao encontrado.");
  if (space.min_eligible_sales > getMemberEligibleSales(session.affiliateId)) {
    throw new Error("Voce ainda nao tem acesso a este espaco.");
  }

  const postId = createPost({
    spaceId: space.id,
    authorType: "member",
    authorId: session.affiliateId,
    title,
    body,
  });

  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    const saved = await saveImage(image, "posts");
    if (saved.ok) setPostImage(postId, saved.storedPath);
  }

  revalidatePath("/socio/comunidade");
  revalidatePath(`/socio/comunidade/${space.slug}`);
  redirect(`/socio/comunidade/${space.slug}/${postId}`);
}

export async function createCommunityCommentAction(formData: FormData) {
  const session = await requireAffiliate();
  const postId = Number(requireText(formData, "post_id", 20));
  const body = requireText(formData, "body", 4000);

  const post = getPostById(postId);
  if (!post) throw new Error("Publicacao nao encontrada.");

  if (containsExternalLink(body)) {
    redirect(`/socio/comunidade/${post.space_slug}/${postId}?erro=link`);
  }

  const space = getSpaceBySlug(post.space_slug);
  if (!space) throw new Error("Espaco nao encontrado.");
  if (space.min_eligible_sales > getMemberEligibleSales(session.affiliateId)) {
    throw new Error("Voce ainda nao tem acesso a este espaco.");
  }

  const commentId = createComment({
    postId,
    authorType: "member",
    authorId: session.affiliateId,
    body,
  });

  notifyComment({
    postId,
    commentId,
    actorType: "member",
    actorId: session.affiliateId,
  });

  revalidatePath("/socio/comunidade/notificacoes");
  revalidatePath(`/socio/comunidade/${post.space_slug}/${postId}`);
  revalidatePath(`/socio/comunidade/${post.space_slug}`);
  revalidatePath("/socio/comunidade");
}

async function requireAccessiblePost(postId: number, affiliateId: number) {
  const post = getPostById(postId);
  if (!post) throw new Error("Publicacao nao encontrada.");
  const space = getSpaceBySlug(post.space_slug);
  if (!space) throw new Error("Espaco nao encontrado.");
  if (space.min_eligible_sales > getMemberEligibleSales(affiliateId)) {
    throw new Error("Voce ainda nao tem acesso a este espaco.");
  }
  return post;
}

export async function reactToPostAction(formData: FormData) {
  const session = await requireAffiliate();
  const postId = Number(requireText(formData, "post_id", 20));
  const kind = asText(formData, "kind");
  if (!isReactionKind(kind)) throw new Error("Reacao invalida.");

  const post = await requireAccessiblePost(postId, session.affiliateId);
  const applied = setReaction(postId, session.affiliateId, kind);

  // setReaction devolve null quando o clique retirou a reacao. Nesse caso a
  // notificacao sai, em vez de apontar para algo que nao existe mais.
  if (applied) {
    notifyReaction({
      postId,
      actorType: "member",
      actorId: session.affiliateId,
      kind: applied,
    });
  } else {
    clearReactionNotification({
      postId,
      actorType: "member",
      actorId: session.affiliateId,
    });
  }

  revalidatePath("/socio/comunidade/notificacoes");
  revalidatePath("/socio/comunidade");
  revalidatePath(`/socio/comunidade/${post.space_slug}`);
  revalidatePath(`/socio/comunidade/${post.space_slug}/${postId}`);
  revalidatePath("/socio/comunidade/favoritos");
}

export async function toggleFavoriteAction(formData: FormData) {
  const session = await requireAffiliate();
  const postId = Number(requireText(formData, "post_id", 20));

  const post = await requireAccessiblePost(postId, session.affiliateId);
  toggleFavorite(postId, session.affiliateId);

  revalidatePath("/socio/comunidade");
  revalidatePath(`/socio/comunidade/${post.space_slug}`);
  revalidatePath(`/socio/comunidade/${post.space_slug}/${postId}`);
  revalidatePath("/socio/comunidade/favoritos");
}

export async function toggleEventRsvpAction(formData: FormData) {
  const session = await requireAffiliate();
  const eventId = Number(requireText(formData, "event_id", 20));
  const event = getEventById(eventId);
  if (!event) throw new Error("Evento nao encontrado.");
  if (event.status !== "scheduled") throw new Error("Este evento nao esta aberto para confirmacao.");

  toggleRsvp(eventId, session.affiliateId);

  revalidatePath("/socio/comunidade");
  revalidatePath("/socio/comunidade/eventos");
  revalidatePath("/admin/eventos");
}

export async function updateAvatarAction(formData: FormData) {
  const session = await requireAffiliate();
  const image = formData.get("avatar");

  if (!(image instanceof File) || image.size === 0) {
    redirect("/socio/comunidade/perfil?erro=vazio");
  }

  const saved = await saveImage(image, "avatars");
  if (!saved.ok) {
    redirect(`/socio/comunidade/perfil?erro=${saved.reason}`);
  }

  setAvatar(session.affiliateId, saved.storedPath);
  revalidatePath("/socio/comunidade", "layout");
  redirect("/socio/comunidade/perfil?ok=1");
}

export async function removeAvatarAction() {
  const session = await requireAffiliate();
  removeAvatar(session.affiliateId);
  revalidatePath("/socio/comunidade", "layout");
  redirect("/socio/comunidade/perfil?removido=1");
}

export async function markNotificationsReadAction() {
  const session = await requireAffiliate();
  markAllRead(session.affiliateId);
  revalidatePath("/socio/comunidade/notificacoes");
  revalidatePath("/socio/comunidade");
}
