"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAffiliate } from "@/lib/auth";
import {
  createComment,
  createPost,
  getMemberEligibleSales,
  getPostById,
  getSpaceBySlug,
} from "@/lib/community";

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

  const space = getSpaceBySlug(post.space_slug);
  if (!space) throw new Error("Espaco nao encontrado.");
  if (space.min_eligible_sales > getMemberEligibleSales(session.affiliateId)) {
    throw new Error("Voce ainda nao tem acesso a este espaco.");
  }

  createComment({
    postId,
    authorType: "member",
    authorId: session.affiliateId,
    body,
  });

  revalidatePath(`/socio/comunidade/${post.space_slug}/${postId}`);
  revalidatePath(`/socio/comunidade/${post.space_slug}`);
  revalidatePath("/socio/comunidade");
}
