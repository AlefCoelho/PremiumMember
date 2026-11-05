"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import {
  addMaterialFile,
  createLesson,
  createModule,
  deleteLesson,
  deleteMaterial,
  deleteModule,
  extractYoutubeId,
  getAdminCourse,
  getLessonById,
  getLessonMaterials,
  getMaterialById,
  getModuleById,
  isLessonKind,
  isModuleStatus,
  isVideoProvider,
  setSpacePresentation,
  setLessonPresentation,
  moveLesson,
  moveModule,
  renameModule,
  setLessonStatus,
  setModuleStatusValue,
  updateLesson,
  type VideoProvider,
} from "@/lib/lessons";
import { getSpaceById, updateSpace } from "@/lib/community";
import { MAX_MATERIAL_BYTES, deleteImage, saveMaterial } from "@/lib/storage";
import { publishNews } from "@/lib/news";

const ADMIN_PATH = "/admin/aulas";

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

function requireStatus(formData: FormData) {
  const value = asText(formData, "status");
  if (value !== "active" && value !== "archived") throw new Error("Status invalido.");
  return value;
}

function asCount(formData: FormData, key: string, max: number) {
  const value = Number(asText(formData, key) || "0");
  if (!Number.isFinite(value) || value < 0) throw new Error(`Valor invalido: ${key}`);
  return Math.min(Math.floor(value), max);
}

function requireExistingModule(moduleId: number) {
  const row = getModuleById(moduleId);
  if (!row) throw new Error("Modulo nao encontrado.");
  return row;
}

function requireExistingLesson(lessonId: number) {
  const row = getLessonById(lessonId);
  if (!row) throw new Error("Aula nao encontrada.");
  return row;
}

/**
 * O provedor e o id do video, a partir do que o admin colou. O campo aceita o
 * link inteiro do YouTube; so guardamos o id.
 */
function readVideo(formData: FormData): { provider: VideoProvider; id: string } {
  const provider = asText(formData, "video_provider") || "none";
  if (!isVideoProvider(provider)) throw new Error("Provedor de video invalido.");
  if (provider === "none") return { provider: "none", id: "" };

  const raw = asText(formData, "video_url");
  if (!raw) return { provider: "none", id: "" };

  const id = extractYoutubeId(raw);
  if (!id) {
    throw new Error(
      "Nao reconheci o link do YouTube. Cole o endereco do video (ou so o id de 11 caracteres)."
    );
  }
  return { provider: "youtube", id };
}

// A trilha e a pagina de aula do membro vivem sob /socio/comunidade.
function revalidateLessons() {
  revalidatePath(ADMIN_PATH);
  revalidatePath("/socio/comunidade", "layout");
}

function back(spaceId: number, ok: string) {
  redirect(`${ADMIN_PATH}?curso=${spaceId}&ok=${ok}`);
}

/* --------------------------------------------------------------- modulos --- */

export async function createModuleAction(formData: FormData) {
  await requireAdmin();
  const spaceId = requireId(formData, "space_id");
  const title = requireText(formData, "title", 90);

  createModule({ spaceId, title });
  revalidateLessons();
  back(spaceId, "modulo-criado");
}

export async function renameModuleAction(formData: FormData) {
  await requireAdmin();
  const moduleId = requireId(formData, "module_id");
  const title = requireText(formData, "title", 90);

  const row = requireExistingModule(moduleId);
  renameModule(moduleId, title);
  revalidateLessons();
  back(row.space_id, "modulo-salvo");
}

export async function moveModuleAction(formData: FormData) {
  await requireAdmin();
  const moduleId = requireId(formData, "module_id");
  const direction = requireDirection(formData);

  const row = requireExistingModule(moduleId);
  moveModule(moduleId, direction);
  revalidateLessons();
  redirect(`${ADMIN_PATH}?curso=${row.space_id}`);
}

export async function setModuleStatusAction(formData: FormData) {
  await requireAdmin();
  const moduleId = requireId(formData, "module_id");
  const status = asText(formData, "status");
  if (!isModuleStatus(status)) throw new Error("Status de modulo invalido.");

  const row = requireExistingModule(moduleId);
  setModuleStatusValue(moduleId, status);
  revalidateLessons();
  back(row.space_id, "modulo-salvo");
}

export async function deleteModuleAction(formData: FormData) {
  await requireAdmin();
  const moduleId = requireId(formData, "module_id");
  const confirmation = asText(formData, "confirm").toUpperCase();
  if (confirmation !== "EXCLUIR") {
    throw new Error("Para excluir o modulo digite EXCLUIR no campo de confirmacao.");
  }

  const row = requireExistingModule(moduleId);
  // Os arquivos de material do modulo precisam sair do disco antes das linhas:
  // o CASCADE apaga o registro e deixaria o arquivo orfao para sempre.
  const target = getAdminCourse(row.space_id).find((item) => item.id === moduleId);
  for (const lesson of target?.lessons ?? []) {
    for (const material of getLessonMaterials(lesson.id)) {
      if (material.stored_path) deleteImage(material.stored_path);
    }
  }

  deleteModule(moduleId);
  revalidateLessons();
  back(row.space_id, "modulo-excluido");
}

/* ----------------------------------------------------------------- aulas --- */

function readLessonFields(formData: FormData) {
  const video = readVideo(formData);
  return {
    title: requireText(formData, "title", 120),
    summary: asText(formData, "summary").slice(0, 300),
    body: asText(formData, "body").slice(0, 8000),
    videoProvider: video.provider,
    videoId: video.id,
    durationMinutes: asCount(formData, "duration_minutes", 1200),
    minEligibleSales: asCount(formData, "min_eligible_sales", 9999),
  };
}

export async function createLessonAction(formData: FormData) {
  await requireAdmin();
  const moduleId = requireId(formData, "module_id");
  const row = requireExistingModule(moduleId);

  const campos = readLessonFields(formData);
  const criada = createLesson({ moduleId, ...campos });

  // O aviso sai na criacao, nao na edicao: corrigir um titulo nao e novidade,
  // e o sino do membro perderia o sentido se piscasse a cada ajuste de texto.
  const curso = getSpaceById(row.space_id);
  publishNews({
    kind: "aula",
    title: campos.title,
    detail: curso ? `Nova aula em ${curso.name}` : "Nova aula publicada",
    href: `/socio/aula/${criada.slug}`,
  });

  revalidateLessons();
  back(row.space_id, "aula-criada");
}

export async function updateLessonAction(formData: FormData) {
  await requireAdmin();
  const lessonId = requireId(formData, "lesson_id");
  const moduleId = requireId(formData, "module_id");

  requireExistingLesson(lessonId);
  const row = requireExistingModule(moduleId);
  updateLesson(lessonId, { moduleId, ...readLessonFields(formData) });
  revalidateLessons();
  back(row.space_id, "aula-salva");
}

export async function moveLessonAction(formData: FormData) {
  await requireAdmin();
  const lessonId = requireId(formData, "lesson_id");
  const direction = requireDirection(formData);

  const lesson = requireExistingLesson(lessonId);
  const row = requireExistingModule(lesson.module_id);
  moveLesson(lessonId, direction);
  revalidateLessons();
  redirect(`${ADMIN_PATH}?curso=${row.space_id}`);
}

export async function setLessonStatusAction(formData: FormData) {
  await requireAdmin();
  const lessonId = requireId(formData, "lesson_id");
  const status = requireStatus(formData);

  const lesson = requireExistingLesson(lessonId);
  const row = requireExistingModule(lesson.module_id);
  setLessonStatus(lessonId, status);
  revalidateLessons();
  back(row.space_id, status === "archived" ? "aula-arquivada" : "aula-reativada");
}

export async function deleteLessonAction(formData: FormData) {
  await requireAdmin();
  const lessonId = requireId(formData, "lesson_id");
  const confirmation = asText(formData, "confirm").toUpperCase();
  if (confirmation !== "EXCLUIR") {
    throw new Error("Para excluir a aula digite EXCLUIR no campo de confirmacao.");
  }

  const lesson = requireExistingLesson(lessonId);
  const row = requireExistingModule(lesson.module_id);

  for (const material of getLessonMaterials(lessonId)) {
    if (material.stored_path) deleteImage(material.stored_path);
  }

  deleteLesson(lessonId);
  revalidateLessons();
  back(row.space_id, "aula-excluida");
}

/* ------------------------------------------------------------- materiais --- */

export async function addMaterialAction(formData: FormData) {
  await requireAdmin();
  const lessonId = requireId(formData, "lesson_id");
  const lesson = requireExistingLesson(lessonId);
  const row = requireExistingModule(lesson.module_id);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("Escolha um arquivo.");

  const label = asText(formData, "label").slice(0, 120) || file.name.slice(0, 120);
  const saved = await saveMaterial(file);
  if (!saved.ok) {
    const mensagem =
      saved.reason === "tamanho"
        ? `Arquivo acima de ${Math.round(MAX_MATERIAL_BYTES / (1024 * 1024))} MB.`
        : saved.reason === "tipo"
          ? "Tipo de arquivo nao aceito. Use PDF, ZIP, planilha, documento ou imagem."
          : "Arquivo vazio.";
    throw new Error(mensagem);
  }

  addMaterialFile({
    lessonId,
    label,
    storedPath: saved.storedPath,
    sizeBytes: saved.sizeBytes,
    mime: saved.mime,
  });
  revalidateLessons();
  back(row.space_id, "material-anexado");
}

export async function deleteMaterialAction(formData: FormData) {
  await requireAdmin();
  const materialId = requireId(formData, "material_id");
  const material = getMaterialById(materialId);
  if (!material) throw new Error("Material nao encontrado.");

  const lesson = requireExistingLesson(material.lesson_id);
  const row = requireExistingModule(lesson.module_id);

  // Primeiro o arquivo, depois a linha: se a ordem fosse inversa e a remocao do
  // arquivo falhasse, o arquivo ficaria no disco sem ninguem que o conhecesse.
  if (material.stored_path) deleteImage(material.stored_path);
  deleteMaterial(materialId);
  revalidateLessons();
  back(row.space_id, "material-removido");
}

/* ----------------------------------------------------------- vitrine ------ */

/**
 * Titulo, descricao e vitrine do curso, no mesmo formulario.
 *
 * O titulo e a descricao moram em community_spaces (sao do espaco); emoji,
 * chamada, capa e destaque moram em space_presentation. O admin edita tudo
 * de um lugar so — ele nao deveria precisar saber dessa divisao.
 */
export async function updateSpacePresentationAction(formData: FormData) {
  await requireAdmin();
  const spaceId = requireId(formData, "space_id");
  const space = getSpaceById(spaceId);
  if (!space) throw new Error("Curso nao encontrado.");

  const name = requireText(formData, "name", 80);
  const description = asText(formData, "description").slice(0, 400);

  // Grupo, tipo e vendas minimas ficam como estao: quem muda isso e o painel
  // da comunidade. Aqui o admin esta cuidando da vitrine, nao da estrutura.
  updateSpace(spaceId, {
    groupId: space.group_id,
    name,
    description,
    kind: "lessons",
    minEligibleSales: space.min_eligible_sales,
  });

  // Capa nao entra mais aqui: ela e a miniatura da primeira aula no YouTube.
  // Upload de capa custava disco da VPS e um passo a mais em cada curso, para
  // repetir uma imagem que o YouTube ja hospeda de graca.
  setSpacePresentation(spaceId, {
    emoji: asText(formData, "emoji").slice(0, 8),
    headline: asText(formData, "headline").slice(0, 160),
    featured: asText(formData, "featured") === "1",
  });

  revalidateLessons();
  back(spaceId, "vitrine-salva");
}

/** O tipo da aula: video, material ou texto. A miniatura vem do YouTube. */
export async function updateLessonPresentationAction(formData: FormData) {
  await requireAdmin();
  const lessonId = requireId(formData, "lesson_id");
  const lesson = requireExistingLesson(lessonId);
  const row = requireExistingModule(lesson.module_id);

  const kind = asText(formData, "lesson_kind");
  if (!isLessonKind(kind)) throw new Error("Tipo de aula invalido.");

  setLessonPresentation(lessonId, { kind });
  revalidateLessons();
  back(row.space_id, "aula-salva");
}
