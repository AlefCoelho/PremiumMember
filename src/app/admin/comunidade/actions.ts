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
  moveGroup,
  moveSpace,
  renameGroup,
  setGroupStatus,
  setSpaceStatus,
  updateSpace,
  type SpaceKind,
} from "@/lib/community";

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

  requireExistingGroup(groupId);
  createSpace({ groupId, name, description, kind, minEligibleSales });
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
