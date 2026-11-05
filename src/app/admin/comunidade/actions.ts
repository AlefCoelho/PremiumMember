"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  createGroup,
  createSpace,
  deleteSpace,
  getGroupById,
  getSpaceById,
  isSpaceKind,
  grantSpaceAccess,
  moveGroup,
  moveSpace,
  renameGroup,
  revokeSpaceAccess,
  setAccessRule,
  setGroupPosition,
  setGroupStatus,
  setSpaceStatus,
  updateSpace,
  type AccessScope,
  type SpaceKind,
} from "@/lib/community";
import { getAffiliateByEmail } from "@/lib/db";
import { publishNews } from "@/lib/news";
import { getSpacePresentation, setSpacePresentation } from "@/lib/lessons";

const ADMIN_PATH = "/admin/comunidade";

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

function requireDirection(formData: FormData) {
  const value = asText(formData, "direction");
  if (value !== "up" && value !== "down") throw new Error("Direcao invalida.");
  return value;
}

function requireKind(formData: FormData): SpaceKind {
  const value = asText(formData, "kind");
  if (!isSpaceKind(value)) throw new Error("Tipo de espaco invalido.");
  return value;
}

function asMinEligibleSales(formData: FormData) {
  const value = Number(asText(formData, "min_eligible_sales") || "0");
  if (!Number.isFinite(value) || value < 0) throw new Error("Vendas minimas invalidas.");
  return Math.min(Math.floor(value), 9999);
}

function requireExistingGroup(groupId: number) {
  const group = getGroupById(groupId);
  if (!group) throw new Error("Grupo nao encontrado.");
  return group;
}

function requireExistingSpace(spaceId: number) {
  const space = getSpaceById(spaceId);
  if (!space) throw new Error("Espaco nao encontrado.");
  return space;
}

// A lateral e o feed do portal do membro sao renderizados pelo layout de /socio/comunidade.
function revalidateCommunity() {
  revalidatePath(ADMIN_PATH);
  revalidatePath("/socio/comunidade", "layout");
}

export async function createCommunityGroupAction(formData: FormData) {
  await requireAdmin();
  const name = requireText(formData, "name", 80);

  createGroup({ name });
  revalidateCommunity();
  redirect(`${ADMIN_PATH}?ok=grupo-criado`);
}

export async function renameCommunityGroupAction(formData: FormData) {
  await requireAdmin();
  const groupId = requireId(formData, "group_id");
  const name = requireText(formData, "name", 80);

  requireExistingGroup(groupId);
  renameGroup(groupId, name);
  revalidateCommunity();
  redirect(`${ADMIN_PATH}?ok=grupo-salvo`);
}

export async function moveCommunityGroupAction(formData: FormData) {
  await requireAdmin();
  const groupId = requireId(formData, "group_id");
  const direction = requireDirection(formData);

  requireExistingGroup(groupId);
  moveGroup(groupId, direction);
  revalidateCommunity();
  redirect(ADMIN_PATH);
}

export async function setCommunityGroupPositionAction(formData: FormData) {
  await requireAdmin();
  const groupId = requireId(formData, "group_id");
  const position = Number(asText(formData, "position"));
  if (!Number.isInteger(position) || position < 1) throw new Error("Posicao invalida.");

  requireExistingGroup(groupId);
  setGroupPosition(groupId, position);
  revalidateCommunity();
  redirect(`${ADMIN_PATH}?ok=grupo-movido`);
}

/* Acesso: travamento premium e liberacao programada ------------------------- */

// Link de pagamento aceita so http(s). Sem esta checagem, um "javascript:" ou
// um caminho relativo colado por engano iria direto para o href do botao que o
// membro clica.
function asCheckoutUrl(formData: FormData) {
  const value = asText(formData, "checkout_url").slice(0, 300);
  if (!value) return "";
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Link de pagamento invalido. Cole o endereco completo, comecando com https://");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Link de pagamento precisa comecar com https://");
  }
  return url.toString();
}

// O <input type="datetime-local"> manda "2026-03-01T20:00". Guardo com espaco
// no lugar do T, o mesmo formato das outras datas do banco.
function asReleaseAt(formData: FormData) {
  const value = asText(formData, "release_at");
  if (!value) return "";
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Data de liberacao invalida.");
  return value.replace("T", " ");
}

function asReleaseDays(formData: FormData) {
  const value = Number(asText(formData, "release_days") || "0");
  if (!Number.isFinite(value) || value < 0) throw new Error("Dias de liberacao invalidos.");
  return Math.min(Math.floor(value), 3650);
}

async function saveAccessRule(formData: FormData, scope: AccessScope) {
  await requireAdmin();
  const targetId = requireId(formData, scope === "group" ? "group_id" : "space_id");
  if (scope === "group") requireExistingGroup(targetId);
  else requireExistingSpace(targetId);

  const checkoutUrl = asCheckoutUrl(formData);
  const locked = asText(formData, "locked") === "1";

  // Travar sem link deixaria o membro numa parede sem porta: ele ve que existe
  // e nao tem para onde ir.
  if (locked && !checkoutUrl) {
    throw new Error("Para travar como Premium, informe o link de pagamento.");
  }

  setAccessRule(scope, targetId, {
    locked,
    checkoutUrl,
    priceLabel: asText(formData, "price_label").slice(0, 60),
    pitch: asText(formData, "pitch").slice(0, 400),
    releaseAt: asReleaseAt(formData),
    releaseDays: asReleaseDays(formData),
  });

  revalidateCommunity();
  redirect(`${ADMIN_PATH}?ok=acesso-salvo`);
}

export async function setSpaceAccessAction(formData: FormData) {
  await saveAccessRule(formData, "space");
}

export async function setGroupAccessAction(formData: FormData) {
  await saveAccessRule(formData, "group");
}

export async function grantSpaceAccessAction(formData: FormData) {
  await requireAdmin();
  const spaceId = requireId(formData, "space_id");
  requireExistingSpace(spaceId);

  const email = asText(formData, "email").toLowerCase();
  const affiliate = getAffiliateByEmail(email);
  if (!affiliate) throw new Error(`Nenhum membro com o e-mail ${email}.`);

  grantSpaceAccess(spaceId, affiliate.id, asText(formData, "note"));
  revalidateCommunity();
  redirect(`${ADMIN_PATH}?ok=acesso-liberado`);
}

export async function revokeSpaceAccessAction(formData: FormData) {
  await requireAdmin();
  const spaceId = requireId(formData, "space_id");
  const affiliateId = requireId(formData, "affiliate_id");

  requireExistingSpace(spaceId);
  revokeSpaceAccess(spaceId, affiliateId);
  revalidateCommunity();
  redirect(`${ADMIN_PATH}?ok=acesso-retirado`);
}

export async function setCommunityGroupStatusAction(formData: FormData) {
  await requireAdmin();
  const groupId = requireId(formData, "group_id");
  const status = asText(formData, "status");
  if (status !== "active" && status !== "archived") throw new Error("Status invalido.");

  requireExistingGroup(groupId);
  setGroupStatus(groupId, status);
  revalidateCommunity();
  redirect(`${ADMIN_PATH}?ok=${status === "archived" ? "grupo-arquivado" : "grupo-reativado"}`);
}

export async function createCommunitySpaceAction(formData: FormData) {
  await requireAdmin();
  const groupId = requireId(formData, "group_id");
  const name = requireText(formData, "name", 80);
  const description = asText(formData, "description").slice(0, 400);
  const kind = requireKind(formData);
  const minEligibleSales = asMinEligibleSales(formData);

  const group = requireExistingGroup(groupId);
  const criado = createSpace({ groupId, name, description, kind, minEligibleSales });

  // Espaco com exigencia de venda nao gera aviso: quem nao atingiu a meta
  // receberia novidade de algo que nem consegue abrir.
  if (minEligibleSales === 0) {
    publishNews({
      kind: "espaco",
      title: name,
      detail: `Novo espaco em ${group.name}`,
      href: `/socio/comunidade/${criado.slug}`,
    });
  }

  revalidateCommunity();
  redirect(`${ADMIN_PATH}?ok=espaco-criado`);
}

export async function updateCommunitySpaceAction(formData: FormData) {
  await requireAdmin();
  const spaceId = requireId(formData, "space_id");
  const groupId = requireId(formData, "group_id");
  const name = requireText(formData, "name", 80);
  const description = asText(formData, "description").slice(0, 400);
  const kind = requireKind(formData);
  const minEligibleSales = asMinEligibleSales(formData);

  requireExistingSpace(spaceId);
  requireExistingGroup(groupId);
  updateSpace(spaceId, { groupId, name, description, kind, minEligibleSales });

  // O emoji e a cara do espaco na lateral do membro. Mora em
  // space_presentation; capa e chamada sao preservadas.
  const atual = getSpacePresentation(spaceId);
  setSpacePresentation(spaceId, {
    emoji: asText(formData, "emoji").slice(0, 8),
    headline: atual.headline,
    featured: atual.featured === 1,
  });

  revalidateCommunity();
  redirect(`${ADMIN_PATH}?ok=espaco-salvo`);
}

export async function moveCommunitySpaceAction(formData: FormData) {
  await requireAdmin();
  const spaceId = requireId(formData, "space_id");
  const direction = requireDirection(formData);

  requireExistingSpace(spaceId);
  moveSpace(spaceId, direction);
  revalidateCommunity();
  redirect(ADMIN_PATH);
}

export async function setCommunitySpaceStatusAction(formData: FormData) {
  await requireAdmin();
  const spaceId = requireId(formData, "space_id");
  const status = asText(formData, "status");
  if (status !== "active" && status !== "archived") throw new Error("Status invalido.");

  requireExistingSpace(spaceId);
  setSpaceStatus(spaceId, status);
  revalidateCommunity();
  redirect(`${ADMIN_PATH}?ok=${status === "archived" ? "espaco-arquivado" : "espaco-reativado"}`);
}

export async function deleteCommunitySpaceAction(formData: FormData) {
  await requireAdmin();
  const spaceId = requireId(formData, "space_id");
  const confirmation = asText(formData, "confirm").toUpperCase();
  if (confirmation !== "EXCLUIR") {
    throw new Error('Para excluir o espaco digite EXCLUIR no campo de confirmacao.');
  }

  requireExistingSpace(spaceId);
  deleteSpace(spaceId);
  revalidateCommunity();
  redirect(`${ADMIN_PATH}?ok=espaco-excluido`);
}
