import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// Toda a gravacao de arquivo passa por aqui. Se um dia o destino virar R2,
// Supabase ou outro, muda este modulo e nada mais no projeto.
//
// Os arquivos NAO vao para public/: na saida standalone, public e copiado no
// build, entao o que o membro enviasse depois sumiria no deploy seguinte. Eles
// ficam ao lado do banco, numa pasta que o build nao toca, e sao servidos pela
// rota /uploads.
// Resolvido em runtime, dentro da funcao: calcular isto no escopo do modulo
// fazia o rastreio de arquivos do build concluir que o projeto inteiro era
// dependencia, e a saida standalone saia inflada.
let cachedDir: string | null = null;

function resolveUploadsDir() {
  if (cachedDir) return cachedDir;
  const fromEnv = process.env.SOCIOS_UPLOADS_DIR;
  if (fromEnv) {
    cachedDir = fromEnv;
    return cachedDir;
  }
  const dbPath = process.env.SOCIOS_DB_PATH;
  // Sem SOCIOS_DB_PATH (so em dev), cai em ./data/uploads a partir do cwd.
  const base = dbPath ? path.dirname(dbPath) : `${process.cwd()}/data`;
  cachedDir = `${base}/uploads`;
  return cachedDir;
}

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

// Material de aula e enviado pelo admin e nao passa pelo redimensionamento do
// navegador, entao tem teto proprio. 15 MB fica abaixo do client_max_body_size
// de 20 MB do nginx, com folga para o overhead do multipart.
export const MAX_MATERIAL_BYTES = 15 * 1024 * 1024;

const allowedTypes = new Map([
  ["image/webp", "webp"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
]);

// Tipos de material. Sao os arquivos de apoio da aula: PDF, planilha, ZIP de
// agentes. Video nao entra aqui de proposito — vive no YouTube.
const allowedMaterialTypes = new Map([
  ["application/pdf", "pdf"],
  ["application/zip", "zip"],
  ["application/x-zip-compressed", "zip"],
  ["text/plain", "txt"],
  ["text/markdown", "md"],
  ["text/csv", "csv"],
  ["application/json", "json"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
  ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "pptx"],
  ["image/webp", "webp"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
]);

const materialContentTypes = new Map(
  [...allowedMaterialTypes.entries()].map(([mime, extension]) => [extension, mime])
);

export function getUploadsDir() {
  return resolveUploadsDir();
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export type SaveResult = { ok: true; storedPath: string } | { ok: false; reason: string };

export async function saveImage(
  file: File,
  folder: "avatars" | "posts" | "capas"
): Promise<SaveResult> {
  if (!file || file.size === 0) return { ok: false, reason: "vazio" };

  const extension = allowedTypes.get(file.type);
  if (!extension) return { ok: false, reason: "tipo" };

  // O navegador ja reduz a imagem antes de enviar. Esta checagem e a defesa de
  // quem chamar a rota por fora.
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, reason: "tamanho" };

  const bytes = Buffer.from(await file.arrayBuffer());
  const name = `${crypto.randomBytes(16).toString("hex")}.${extension}`;
  const dir = `${resolveUploadsDir()}/${folder}`;

  ensureDir(dir);
  fs.writeFileSync(`${dir}/${name}`, bytes);

  return { ok: true, storedPath: `${folder}/${name}` };
}

export type SaveMaterialResult =
  | { ok: true; storedPath: string; sizeBytes: number; mime: string }
  | { ok: false; reason: string };

export async function saveMaterial(file: File): Promise<SaveMaterialResult> {
  if (!file || file.size === 0) return { ok: false, reason: "vazio" };

  const extension = allowedMaterialTypes.get(file.type);
  if (!extension) return { ok: false, reason: "tipo" };
  if (file.size > MAX_MATERIAL_BYTES) return { ok: false, reason: "tamanho" };

  const bytes = Buffer.from(await file.arrayBuffer());
  const name = `${crypto.randomBytes(16).toString("hex")}.${extension}`;
  const dir = `${resolveUploadsDir()}/materiais`;

  ensureDir(dir);
  fs.writeFileSync(`${dir}/${name}`, bytes);

  return { ok: true, storedPath: `materiais/${name}`, sizeBytes: file.size, mime: file.type };
}

export function deleteImage(storedPath: string) {
  if (!isSafeStoredPath(storedPath) && !isSafeMaterialPath(storedPath)) return;
  const full = `${resolveUploadsDir()}/${storedPath}`;
  if (fs.existsSync(full)) fs.unlinkSync(full);
}

// Só aceita o formato que nos mesmos geramos. Sem isso, um caminho vindo da URL
// poderia subir de diretorio e ler arquivo do servidor.
export function isSafeStoredPath(storedPath: string) {
  return /^(avatars|posts|capas)\/[a-f0-9]{32}\.(webp|jpg|png)$/.test(storedPath);
}

export function isSafeMaterialPath(storedPath: string) {
  return /^materiais\/[a-f0-9]{32}\.[a-z0-9]{2,5}$/.test(storedPath);
}

/**
 * Le um material do disco. Diferente de `readImage`, isto NAO e seguro de
 * expor por uma rota publica: quem chama precisa ter conferido a sessao e a
 * elegibilidade da aula antes.
 */
export function readMaterial(storedPath: string) {
  if (!isSafeMaterialPath(storedPath)) return null;
  const full = `${resolveUploadsDir()}/${storedPath}`;
  if (!fs.existsSync(full)) return null;

  const extension = path.extname(full).slice(1);
  return {
    bytes: fs.readFileSync(full),
    contentType: materialContentTypes.get(extension) ?? "application/octet-stream",
    extension,
  };
}

export function readImage(storedPath: string) {
  if (!isSafeStoredPath(storedPath)) return null;
  const full = `${resolveUploadsDir()}/${storedPath}`;
  if (!fs.existsSync(full)) return null;

  const extension = path.extname(full).slice(1);
  const contentType =
    extension === "webp" ? "image/webp" : extension === "png" ? "image/png" : "image/jpeg";

  return { bytes: fs.readFileSync(full), contentType };
}

export function publicUrl(storedPath: string | null | undefined) {
  if (!storedPath || !isSafeStoredPath(storedPath)) return null;
  return `/uploads/${storedPath}`;
}
