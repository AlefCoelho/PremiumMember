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
  evaluateSpaceAccess,
  getAffiliateJoinDate,
  getGrantedSpaceIds,
  getMemberEligibleSales,
  getPostById,
  getSpaceBySlug,
  isReactionKind,
  setPostImage,
  setReaction,
  toggleFavorite,
} from "@/lib/community";
import { getEventById, toggleRsvp } from "@/lib/events";
import { markNewsRead } from "@/lib/news";
import { removeAvatar, setAvatar, setProfileInfo } from "@/lib/profiles";
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

  // Mesma regra da pagina do espaco, e nao so a de vendas: sem isto um POST
  // direto publicaria dentro de um espaco travado ou ainda nao liberado.
  const acesso = evaluateSpaceAccess({
    spaceId: space.id,
    groupId: space.group_id,
    minEligibleSales: space.min_eligible_sales,
    eligibleSales: getMemberEligibleSales(session.affiliateId),
    joinedAt: getAffiliateJoinDate(session.affiliateId),
    granted: getGrantedSpaceIds(session.affiliateId).has(space.id),
  });
  if (!acesso.ok) throw new Error("Voce ainda nao tem acesso a este espaco.");

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
  // As novidades da plataforma zeram junto: para o membro, "marcar tudo como
  // lido" e um gesto so, e deixar o ponto do sino aceso depois dele seria
  // confuso.
  markNewsRead(session.affiliateId);
  revalidatePath("/socio/comunidade/notificacoes");
  revalidatePath("/socio/comunidade", "layout");
}

export async function updateProfileInfoAction(formData: FormData) {
  const session = await requireAffiliate();
  const area = asText(formData, "area").slice(0, 80);
  const bio = asText(formData, "bio").slice(0, 400);
  const headline = asText(formData, "headline").slice(0, 100);
  const location = asText(formData, "location").slice(0, 80);

  // Mesma regra do feed nos campos de texto livre: nada de link externo, senao
  // o perfil vira o buraco por onde a divulgacao que o feed barra entra.
  // Os campos de rede social nao passam por aqui de proposito — eles guardam
  // so o nome de usuario, e o dominio quem monta somos nos.
  if (containsExternalLink(`${area} ${bio} ${headline} ${location}`)) {
    redirect("/socio/comunidade/perfil?erro=link");
  }

  setProfileInfo(session.affiliateId, {
    area,
    bio,
    headline,
    location,
    instagram: asText(formData, "instagram"),
    linkedin: asText(formData, "linkedin"),
    twitter: asText(formData, "twitter"),
    facebook: asText(formData, "facebook"),
    listed: asText(formData, "listed") === "1" ? 1 : 0,
  });
  revalidatePath("/socio/comunidade/perfil");
  revalidatePath("/socio/comunidade/membros");
  redirect("/socio/comunidade/perfil?perfil=1");
}
