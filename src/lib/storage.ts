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

const allowedTypes = new Map([
  ["image/webp", "webp"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
]);

export function getUploadsDir() {
  return resolveUploadsDir();
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export type SaveResult = { ok: true; storedPath: string } | { ok: false; reason: string };

export async function saveImage(file: File, folder: "avatars" | "posts"): Promise<SaveResult> {
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

export function deleteImage(storedPath: string) {
  if (!isSafeStoredPath(storedPath)) return;
  const full = `${resolveUploadsDir()}/${storedPath}`;
  if (fs.existsSync(full)) fs.unlinkSync(full);
}

// Só aceita o formato que nos mesmos geramos. Sem isso, um caminho vindo da URL
// poderia subir de diretorio e ler arquivo do servidor.
export function isSafeStoredPath(storedPath: string) {
  return /^(avatars|posts)\/[a-f0-9]{32}\.(webp|jpg|png)$/.test(storedPath);
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
