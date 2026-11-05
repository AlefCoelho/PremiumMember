import { db } from "@/lib/db";
import { youtubeThumb } from "@/lib/youtube";
import {
  evaluateSpaceAccess,
  getAffiliateJoinDate,
  getGrantedSpaceIds,
  slugify,
} from "@/lib/community";

// Aulas do Premium Member.
//
// O curso e o proprio espaco de kind='lessons' da comunidade. Nao e economia de
// tabela: assim as aulas herdam a lateral, a ordenacao, o arquivamento e o
// travamento por vendas que ja existem e ja rodam em producao.
//
//   espaco (kind=lessons)  =  curso
//     modulo                  course_modules
//       aula                  course_lessons
//         materiais           lesson_materials
//
// O video NAO e guardado aqui. Fica no YouTube (nao listado) e a gente guarda
// apenas o id. Com 11 GB livres na VPS, video proprio nao caberia, e servir
// arquivo unico por Node travaria no 4G do celular.

db.exec(`
CREATE TABLE IF NOT EXISTS course_modules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  space_id INTEGER NOT NULL REFERENCES community_spaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  module_id INTEGER NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  video_provider TEXT NOT NULL DEFAULT 'none',
  video_id TEXT NOT NULL DEFAULT '',
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  min_eligible_sales INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lesson_materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_id INTEGER NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'file',
  label TEXT NOT NULL,
  stored_path TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  mime TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  lesson_id INTEGER NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  affiliate_id INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (lesson_id, affiliate_id)
);

-- Mesmo motivo: o tipo da aula e a miniatura sao do admin, e course_lessons
-- nao recebe ALTER.
CREATE TABLE IF NOT EXISTS lesson_presentation (
  lesson_id INTEGER PRIMARY KEY REFERENCES course_lessons(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'video',
  thumb_path TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Conversa dentro da aula. Tabela propria em vez de reaproveitar
-- community_comments: o comentario de aula nao aparece no feed nem nos
-- destaques, e misturar as duas coisas numa tabela so pediria um filtro em
-- toda consulta do feed.
CREATE TABLE IF NOT EXISTS lesson_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lesson_id INTEGER NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL DEFAULT 'member',
  author_id INTEGER NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lesson_favorites (
  lesson_id INTEGER NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  affiliate_id INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (lesson_id, affiliate_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_comments_lesson ON lesson_comments(lesson_id, created_at);
CREATE INDEX IF NOT EXISTS idx_lesson_favorites_member ON lesson_favorites(affiliate_id, created_at);
CREATE INDEX IF NOT EXISTS idx_course_modules_space ON course_modules(space_id, position);
CREATE INDEX IF NOT EXISTS idx_course_lessons_module ON course_lessons(module_id, position);
CREATE INDEX IF NOT EXISTS idx_lesson_materials_lesson ON lesson_materials(lesson_id, position);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_member ON lesson_progress(affiliate_id);
`);

export type CourseModuleRow = {
  id: number;
  space_id: number;
  title: string;
  position: number;
  status: string;
};

export type CourseLessonRow = {
  id: number;
  module_id: number;
  title: string;
  slug: string;
  summary: string;
  body: string;
  video_provider: string;
  video_id: string;
  duration_minutes: number;
  min_eligible_sales: number;
  position: number;
  status: string;
};

export type LessonMaterialRow = {
  id: number;
  lesson_id: number;
  kind: string;
  label: string;
  stored_path: string;
  url: string;
  size_bytes: number;
  mime: string;
  position: number;
};

export type AdminCourseLesson = CourseLessonRow & { material_count: number };
export type AdminCourseModule = CourseModuleRow & { lessons: AdminCourseLesson[] };

export type MemberLesson = CourseLessonRow & {
  /** false quando o membro ainda nao tem vendas suficientes para esta aula. */
  unlocked: boolean;
  completed: boolean;
};
export type MemberModule = { id: number; title: string; lessons: MemberLesson[] };

export const videoProviders = [
  { value: "youtube", label: "YouTube (nao listado)" },
  { value: "none", label: "Sem video (so texto e materiais)" },
] as const;

export type VideoProvider = (typeof videoProviders)[number]["value"];

export function isVideoProvider(value: string): value is VideoProvider {
  return videoProviders.some((item) => item.value === value);
}

// Aceita o link inteiro que o YouTube da em qualquer um dos formatos, ou o id
// cru. Ninguem deveria ter que achar o id na mao: e so colar o que copiou.
export function extractYoutubeId(input: string) {
  const value = input.trim();
  if (!value) return "";
  if (/^[\w-]{11}$/.test(value)) return value;

  const patterns = [
    /[?&]v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /\/embed\/([\w-]{11})/,
    /\/shorts\/([\w-]{11})/,
    /\/live\/([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return match[1];
  }
  return "";
}

function nextModulePosition(spaceId: number) {
  const row = db
    .prepare("SELECT COALESCE(MAX(position), 0) AS max FROM course_modules WHERE space_id = ?")
    .get(spaceId) as { max: number };
  return row.max + 1;
}

function nextLessonPosition(moduleId: number) {
  const row = db
    .prepare("SELECT COALESCE(MAX(position), 0) AS max FROM course_lessons WHERE module_id = ?")
    .get(moduleId) as { max: number };
  return row.max + 1;
}

function createUniqueLessonSlug(title: string) {
  const base = slugify(title) || "aula";
  const exists = db.prepare("SELECT id FROM course_lessons WHERE slug = ?");
  if (!exists.get(base)) return base;
  for (let attempt = 2; attempt < 200; attempt += 1) {
    const candidate = `${base.slice(0, 54)}-${attempt}`;
    if (!exists.get(candidate)) return candidate;
  }
  return `${base.slice(0, 48)}-${Date.now().toString(36).slice(-6)}`;
}

/* ---------------------------------------------------------------- admin ---- */

export type CourseSpace = {
  id: number;
  name: string;
  slug: string;
  group_name: string;
  min_eligible_sales: number;
  status: string;
};

/** Os espacos kind='lessons', que e o que o painel de aulas trata como curso. */
export function getCourseSpaces(): CourseSpace[] {
  return db
    .prepare(
      `SELECT community_spaces.id,
              community_spaces.name,
              community_spaces.slug,
              community_spaces.min_eligible_sales,
              community_spaces.status,
              community_groups.name AS group_name
       FROM community_spaces
       JOIN community_groups ON community_groups.id = community_spaces.group_id
       WHERE community_spaces.kind = 'lessons'
       ORDER BY community_groups.position, community_spaces.position, community_spaces.id`
    )
    .all() as CourseSpace[];
}

export function getAdminCourse(spaceId: number): AdminCourseModule[] {
  const modules = db
    .prepare(
      `SELECT id, space_id, title, position, status
       FROM course_modules WHERE space_id = ?
       ORDER BY position, id`
    )
    .all(spaceId) as CourseModuleRow[];

  if (modules.length === 0) return [];

  const lessons = db
    .prepare(
      `SELECT course_lessons.*,
              (
                SELECT COUNT(*) FROM lesson_materials
                WHERE lesson_materials.lesson_id = course_lessons.id
              ) AS material_count
       FROM course_lessons
       WHERE module_id IN (${modules.map(() => "?").join(",")})
       ORDER BY position, id`
    )
    .all(...modules.map((item) => item.id)) as AdminCourseLesson[];

  return modules.map((item) => ({
    ...item,
    lessons: lessons.filter((lesson) => lesson.module_id === item.id),
  }));
}

export function getModuleById(moduleId: number) {
  return db.prepare("SELECT * FROM course_modules WHERE id = ?").get(moduleId) as
    | CourseModuleRow
    | undefined;
}

export function getLessonById(lessonId: number) {
  return db.prepare("SELECT * FROM course_lessons WHERE id = ?").get(lessonId) as
    | CourseLessonRow
    | undefined;
}

export function createModule(input: { spaceId: number; title: string }) {
  const result = db
    .prepare("INSERT INTO course_modules (space_id, title, position) VALUES (?, ?, ?)")
    .run(input.spaceId, input.title, nextModulePosition(input.spaceId));
  return Number(result.lastInsertRowid);
}

export function renameModule(moduleId: number, title: string) {
  db.prepare("UPDATE course_modules SET title = ? WHERE id = ?").run(title, moduleId);
}

export function setModuleStatus(moduleId: number, status: "active" | "archived") {
  db.prepare("UPDATE course_modules SET status = ? WHERE id = ?").run(status, moduleId);
}

/** ON DELETE CASCADE leva aulas, materiais e progresso do modulo junto. */
export function deleteModule(moduleId: number) {
  db.prepare("DELETE FROM course_modules WHERE id = ?").run(moduleId);
}

export function createLesson(input: {
  moduleId: number;
  title: string;
  summary: string;
  body: string;
  videoProvider: VideoProvider;
  videoId: string;
  durationMinutes: number;
  minEligibleSales: number;
}) {
  const slug = createUniqueLessonSlug(input.title);
  const result = db
    .prepare(
      `INSERT INTO course_lessons
         (module_id, title, slug, summary, body, video_provider, video_id,
          duration_minutes, min_eligible_sales, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.moduleId,
      input.title,
      slug,
      input.summary,
      input.body,
      input.videoProvider,
      input.videoId,
      input.durationMinutes,
      input.minEligibleSales,
      nextLessonPosition(input.moduleId)
    );
  return { id: Number(result.lastInsertRowid), slug };
}

// O slug nunca e atualizado aqui, igual ao espaco: link de aula ja divulgado
// nao pode quebrar por causa de um titulo reescrito.
export function updateLesson(
  lessonId: number,
  input: {
    moduleId: number;
    title: string;
    summary: string;
    body: string;
    videoProvider: VideoProvider;
    videoId: string;
    durationMinutes: number;
    minEligibleSales: number;
  }
) {
  const current = getLessonById(lessonId);
  if (!current) throw new Error("Aula nao encontrada.");
  const position =
    current.module_id === input.moduleId
      ? current.position
      : nextLessonPosition(input.moduleId);

  db.prepare(
    `UPDATE course_lessons
     SET module_id = ?, title = ?, summary = ?, body = ?, video_provider = ?, video_id = ?,
         duration_minutes = ?, min_eligible_sales = ?, position = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(
    input.moduleId,
    input.title,
    input.summary,
    input.body,
    input.videoProvider,
    input.videoId,
    input.durationMinutes,
    input.minEligibleSales,
    position,
    lessonId
  );
}

export function setLessonStatus(lessonId: number, status: "active" | "archived") {
  db.prepare("UPDATE course_lessons SET status = ? WHERE id = ?").run(status, lessonId);
}

export function deleteLesson(lessonId: number) {
  db.prepare("DELETE FROM course_lessons WHERE id = ?").run(lessonId);
}

function swapPositions(
  table: "course_modules" | "course_lessons",
  rows: { id: number; position: number }[],
  id: number,
  direction: "up" | "down"
) {
  const index = rows.findIndex((row) => row.id === id);
  if (index < 0) return;
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= rows.length) return;

  const update = db.prepare(`UPDATE ${table} SET position = ? WHERE id = ?`);
  const reorder = db.transaction(() => {
    // Normaliza antes de trocar: posicoes podem ter empates.
    rows.forEach((row, order) => update.run(order + 1, row.id));
    update.run(targetIndex + 1, rows[index].id);
    update.run(index + 1, rows[targetIndex].id);
  });
  reorder();
}

export function moveModule(moduleId: number, direction: "up" | "down") {
  const current = getModuleById(moduleId);
  if (!current) return;
  const rows = db
    .prepare("SELECT id, position FROM course_modules WHERE space_id = ? ORDER BY position, id")
    .all(current.space_id) as { id: number; position: number }[];
  swapPositions("course_modules", rows, moduleId, direction);
}

export function moveLesson(lessonId: number, direction: "up" | "down") {
  const current = getLessonById(lessonId);
  if (!current) return;
  const rows = db
    .prepare("SELECT id, position FROM course_lessons WHERE module_id = ? ORDER BY position, id")
    .all(current.module_id) as { id: number; position: number }[];
  swapPositions("course_lessons", rows, lessonId, direction);
}

/* ------------------------------------------------------------ materiais ---- */

export function getLessonMaterials(lessonId: number): LessonMaterialRow[] {
  return db
    .prepare("SELECT * FROM lesson_materials WHERE lesson_id = ? ORDER BY position, id")
    .all(lessonId) as LessonMaterialRow[];
}

export function addMaterialFile(input: {
  lessonId: number;
  label: string;
  storedPath: string;
  sizeBytes: number;
  mime: string;
}) {
  const row = db
    .prepare("SELECT COALESCE(MAX(position), 0) AS max FROM lesson_materials WHERE lesson_id = ?")
    .get(input.lessonId) as { max: number };

  const result = db
    .prepare(
      `INSERT INTO lesson_materials (lesson_id, kind, label, stored_path, size_bytes, mime, position)
       VALUES (?, 'file', ?, ?, ?, ?, ?)`
    )
    .run(input.lessonId, input.label, input.storedPath, input.sizeBytes, input.mime, row.max + 1);
  return Number(result.lastInsertRowid);
}

export function getMaterialById(materialId: number) {
  return db.prepare("SELECT * FROM lesson_materials WHERE id = ?").get(materialId) as
    | LessonMaterialRow
    | undefined;
}

export function deleteMaterial(materialId: number) {
  db.prepare("DELETE FROM lesson_materials WHERE id = ?").run(materialId);
}

/* --------------------------------------------------------------- membro ---- */

/**
 * A trilha como o membro ve. `eligibleSales` decide o que esta destravado.
 *
 * Aula travada vem na lista, com `unlocked: false`: travar escondendo nao
 * mostra ao membro o que ele ganha ao vender. Quem monta a tela nao deve
 * entregar `body`, video nem material de aula travada.
 */
export function getMemberCourse(spaceId: number, affiliateId: number, eligibleSales: number) {
  const modules = db
    .prepare(
      `SELECT id, space_id, title, position, status
       FROM course_modules
       WHERE space_id = ? AND status = 'active'
       ORDER BY position, id`
    )
    .all(spaceId) as CourseModuleRow[];

  if (modules.length === 0) {
    return { modules: [] as MemberModule[], total: 0, completed: 0 };
  }

  const placeholders = modules.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT course_lessons.*,
              (
                SELECT COUNT(*) FROM lesson_progress
                WHERE lesson_progress.lesson_id = course_lessons.id
                  AND lesson_progress.affiliate_id = ?
              ) AS done
       FROM course_lessons
       WHERE module_id IN (${placeholders}) AND status = 'active'
       ORDER BY position, id`
    )
    .all(affiliateId, ...modules.map((item) => item.id)) as (CourseLessonRow & { done: number })[];

  const lessons: MemberLesson[] = rows.map(({ done, ...lesson }) => ({
    ...lesson,
    unlocked: lesson.min_eligible_sales <= eligibleSales,
    completed: done > 0,
  }));

  return {
    modules: modules.map((item) => ({
      id: item.id,
      title: item.title,
      lessons: lessons.filter((lesson) => lesson.module_id === item.id),
    })),
    total: lessons.length,
    // Aula travada nao entra na conta de concluidas nem no total do progresso
    // do que ele pode fazer hoje; o total acima e o curso inteiro.
    completed: lessons.filter((lesson) => lesson.completed).length,
  };
}

export type LessonForMember = {
  lesson: CourseLessonRow;
  moduleTitle: string;
  spaceId: number;
  spaceGroupId: number;
  spaceSlug: string;
  spaceName: string;
  spaceMinEligibleSales: number;
};

/** A aula pelo slug, junto com o espaco dela, para a pagina do membro. */
export function getLessonBySlug(slug: string): LessonForMember | undefined {
  const row = db
    .prepare(
      `SELECT course_lessons.*,
              course_modules.title AS module_title,
              community_spaces.id AS space_id,
              community_spaces.group_id AS space_group,
              community_spaces.slug AS space_slug,
              community_spaces.name AS space_name,
              community_spaces.min_eligible_sales AS space_min
       FROM course_lessons
       JOIN course_modules ON course_modules.id = course_lessons.module_id
       JOIN community_spaces ON community_spaces.id = course_modules.space_id
       WHERE course_lessons.slug = ?
         AND course_lessons.status = 'active'
         AND course_modules.status = 'active'
         AND community_spaces.status = 'active'`
    )
    .get(slug) as
    | (CourseLessonRow & {
        module_title: string;
        space_id: number;
        space_group: number;
        space_slug: string;
        space_name: string;
        space_min: number;
      })
    | undefined;

  if (!row) return undefined;
  const { module_title, space_id, space_group, space_slug, space_name, space_min, ...lesson } = row;
  return {
    lesson,
    moduleTitle: module_title,
    spaceId: space_id,
    spaceGroupId: space_group,
    spaceSlug: space_slug,
    spaceName: space_name,
    spaceMinEligibleSales: space_min,
  };
}

/**
 * A regra de acesso, num lugar so: vale a exigencia mais alta entre o espaco e
 * a aula. Tudo que entrega conteudo (pagina e download de material) passa por
 * aqui, senao quem descobrisse o endereco baixaria material de aula travada.
 */
export function requiredSalesFor(entry: LessonForMember) {
  return Math.max(entry.spaceMinEligibleSales, entry.lesson.min_eligible_sales);
}

export function canOpenLesson(entry: LessonForMember, eligibleSales: number) {
  return eligibleSales >= requiredSalesFor(entry);
}

/**
 * O acesso completo a uma aula: vendas (do espaco e da propria aula) mais a
 * regra do espaco e do grupo — travamento premium e liberacao programada.
 *
 * Tudo que entrega conteudo de aula chama esta funcao, nao canOpenLesson
 * sozinha: sem isso o endereco direto da aula furaria o travamento do espaco,
 * e o paywall viraria decoracao da lateral.
 */
export function memberCanOpenLesson(
  entry: LessonForMember,
  affiliateId: number,
  eligibleSales: number
) {
  if (!canOpenLesson(entry, eligibleSales)) return false;

  const acesso = evaluateSpaceAccess({
    spaceId: entry.spaceId,
    groupId: entry.spaceGroupId,
    minEligibleSales: 0,
    eligibleSales,
    joinedAt: getAffiliateJoinDate(affiliateId),
    granted: getGrantedSpaceIds(affiliateId).has(entry.spaceId),
  });
  return acesso.ok;
}

export function isLessonCompleted(lessonId: number, affiliateId: number) {
  return Boolean(
    db
      .prepare("SELECT 1 FROM lesson_progress WHERE lesson_id = ? AND affiliate_id = ?")
      .get(lessonId, affiliateId)
  );
}

export function setLessonCompleted(lessonId: number, affiliateId: number, completed: boolean) {
  if (completed) {
    db.prepare(
      "INSERT OR IGNORE INTO lesson_progress (lesson_id, affiliate_id) VALUES (?, ?)"
    ).run(lessonId, affiliateId);
    return;
  }
  db.prepare("DELETE FROM lesson_progress WHERE lesson_id = ? AND affiliate_id = ?").run(
    lessonId,
    affiliateId
  );
}

/** A aula seguinte da trilha, para o botao de continuar. */
export function getNextLesson(entry: LessonForMember) {
  const flat = db
    .prepare(
      `SELECT course_lessons.id, course_lessons.slug, course_lessons.title
       FROM course_lessons
       JOIN course_modules ON course_modules.id = course_lessons.module_id
       WHERE course_modules.space_id = ?
         AND course_lessons.status = 'active'
         AND course_modules.status = 'active'
       ORDER BY course_modules.position, course_modules.id,
                course_lessons.position, course_lessons.id`
    )
    .all(entry.spaceId) as { id: number; slug: string; title: string }[];

  const index = flat.findIndex((item) => item.id === entry.lesson.id);
  if (index < 0 || index + 1 >= flat.length) return undefined;
  return flat[index + 1];
}

/* -------------------------------------------------------- apresentacao ---- */

export const lessonKinds = [
  { value: "video", label: "Aula em video" },
  { value: "material", label: "Material para baixar (sem video)" },
  { value: "texto", label: "Somente texto" },
] as const;

export type LessonKind = (typeof lessonKinds)[number]["value"];

export function isLessonKind(value: string): value is LessonKind {
  return lessonKinds.some((item) => item.value === value);
}

// A coluna cover_path continua no banco mas nao e mais lida nem escrita: a
// capa do curso agora vem da miniatura do YouTube. O projeto nunca derruba
// coluna, e deixar a antiga parada nao custa nada.
export type SpacePresentation = {
  space_id: number;
  emoji: string;
  headline: string;
  featured: number;
};

const emptyPresentation = (spaceId: number): SpacePresentation => ({
  space_id: spaceId,
  emoji: "",
  headline: "",
  featured: 0,
});

export function getSpacePresentation(spaceId: number): SpacePresentation {
  const row = db
    .prepare("SELECT space_id, emoji, headline, featured FROM space_presentation WHERE space_id = ?")
    .get(spaceId) as SpacePresentation | undefined;
  return row ?? emptyPresentation(spaceId);
}

export function getSpacePresentationMap(): Map<number, SpacePresentation> {
  const rows = db
    .prepare("SELECT space_id, emoji, headline, featured FROM space_presentation")
    .all() as SpacePresentation[];
  return new Map(rows.map((row) => [row.space_id, row]));
}

/** Grava a vitrine do curso: emoji, chamada e destaque. */
export function setSpacePresentation(
  spaceId: number,
  input: { emoji: string; headline: string; featured: boolean }
) {
  db.prepare(
    `INSERT INTO space_presentation (space_id, emoji, headline, featured, updated_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(space_id) DO UPDATE SET
       emoji = excluded.emoji,
       headline = excluded.headline,
       featured = excluded.featured,
       updated_at = CURRENT_TIMESTAMP`
  ).run(spaceId, input.emoji, input.headline, input.featured ? 1 : 0);
}

// thumb_path tambem ficou para tras: a miniatura e a do YouTube. O que resta
// aqui e o tipo da aula, que o admin escolhe (video, material ou texto).
export type LessonPresentation = { lesson_id: number; kind: string };

export function getLessonPresentationMap(lessonIds: number[]): Map<number, LessonPresentation> {
  if (lessonIds.length === 0) return new Map();
  const rows = db
    .prepare(
      `SELECT lesson_id, kind FROM lesson_presentation
       WHERE lesson_id IN (${lessonIds.map(() => "?").join(",")})`
    )
    .all(...lessonIds) as LessonPresentation[];
  return new Map(rows.map((row) => [row.lesson_id, row]));
}

export function getLessonPresentation(lessonId: number): LessonPresentation {
  return (
    getLessonPresentationMap([lessonId]).get(lessonId) ?? {
      lesson_id: lessonId,
      kind: "video",
    }
  );
}

export function setLessonPresentation(lessonId: number, input: { kind: LessonKind }) {
  db.prepare(
    `INSERT INTO lesson_presentation (lesson_id, kind, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(lesson_id) DO UPDATE SET
       kind = excluded.kind,
       updated_at = CURRENT_TIMESTAMP`
  ).run(lessonId, input.kind);
}

export type CourseSummary = {
  sections: number;
  lessons: number;
  minutes: number;
};

/** "N secoes - N aulas - X h Y min" do cabecalho do curso. */
export function getCourseSummary(spaceId: number): CourseSummary {
  const row = db
    .prepare(
      `SELECT COUNT(DISTINCT course_modules.id) AS sections,
              COUNT(course_lessons.id) AS lessons,
              COALESCE(SUM(course_lessons.duration_minutes), 0) AS minutes
       FROM course_modules
       LEFT JOIN course_lessons
         ON course_lessons.module_id = course_modules.id
        AND course_lessons.status = 'active'
       WHERE course_modules.space_id = ? AND course_modules.status = 'active'`
    )
    .get(spaceId) as CourseSummary;
  return row;
}

export function formatCourseDuration(minutes: number) {
  if (!minutes) return "";
  const horas = Math.floor(minutes / 60);
  const resto = minutes % 60;
  if (!horas) return `${resto} min`;
  if (!resto) return `${horas} h`;
  return `${horas} h ${resto} min`;
}

/** A capa do curso: a miniatura da primeira aula em video que ele tiver. */
export function getCourseCovers(): Map<number, string> {
  const rows = db
    .prepare(
      `SELECT course_modules.space_id AS space_id,
              course_lessons.video_provider,
              course_lessons.video_id
         FROM course_lessons
         JOIN course_modules ON course_modules.id = course_lessons.module_id
        WHERE course_lessons.status = 'active'
          AND course_modules.status = 'active'
          AND course_lessons.video_provider = 'youtube'
          AND course_lessons.video_id != ''
        ORDER BY course_modules.space_id,
                 course_modules.position, course_modules.id,
                 course_lessons.position, course_lessons.id`
    )
    .all() as { space_id: number; video_provider: string; video_id: string }[];

  const capas = new Map<number, string>();
  for (const row of rows) {
    // A consulta ja vem na ordem do curso, entao a primeira linha de cada
    // espaco e a primeira aula dele.
    if (capas.has(row.space_id)) continue;
    capas.set(row.space_id, youtubeThumb(row.video_provider, row.video_id, "capa"));
  }
  return capas;
}

export type CourseCard = CourseSpace & {
  emoji: string;
  headline: string;
  cover_url: string;
  featured: number;
  total: number;
  completed: number;
  percent: number;
  unlocked: boolean;
};

/**
 * A galeria de cursos do membro. Curso travado aparece na vitrine, fechado,
 * dizendo quantas vendas faltam — esconder o que ele ganha ao vender nao vende.
 */
export function getCourseGallery(affiliateId: number, eligibleSales: number): CourseCard[] {
  const spaces = db
    .prepare(
      `SELECT community_spaces.id,
              community_spaces.name,
              community_spaces.slug,
              community_spaces.min_eligible_sales,
              community_spaces.status,
              community_groups.name AS group_name
       FROM community_spaces
       JOIN community_groups ON community_groups.id = community_spaces.group_id
       WHERE community_spaces.kind = 'lessons'
         AND community_spaces.status = 'active'
         AND community_groups.status = 'active'
       ORDER BY community_groups.position, community_spaces.position, community_spaces.id`
    )
    .all() as CourseSpace[];

  if (spaces.length === 0) return [];

  const presentation = getSpacePresentationMap();
  const covers = getCourseCovers();
  const counts = db
    .prepare(
      `SELECT course_modules.space_id AS space_id,
              COUNT(course_lessons.id) AS total,
              SUM(CASE WHEN lesson_progress.affiliate_id IS NULL THEN 0 ELSE 1 END) AS completed
       FROM course_modules
       JOIN course_lessons
         ON course_lessons.module_id = course_modules.id
        AND course_lessons.status = 'active'
       LEFT JOIN lesson_progress
         ON lesson_progress.lesson_id = course_lessons.id
        AND lesson_progress.affiliate_id = ?
       WHERE course_modules.status = 'active'
       GROUP BY course_modules.space_id`
    )
    .all(affiliateId) as { space_id: number; total: number; completed: number }[];

  const bySpace = new Map(counts.map((row) => [row.space_id, row]));

  return spaces.map((space) => {
    const meta = presentation.get(space.id) ?? emptyPresentation(space.id);
    const count = bySpace.get(space.id) ?? { space_id: space.id, total: 0, completed: 0 };
    return {
      ...space,
      emoji: meta.emoji,
      headline: meta.headline,
      cover_url: covers.get(space.id) ?? "",
      featured: meta.featured,
      total: count.total,
      completed: count.completed,
      percent: count.total ? Math.round((count.completed / count.total) * 100) : 0,
      unlocked: space.min_eligible_sales <= eligibleSales,
    };
  });
}

/** Quantas aulas cada curso tem, para a lateral e o painel. */
export function getLessonCountBySpace(): Map<number, number> {
  const rows = db
    .prepare(
      `SELECT course_modules.space_id AS space_id, COUNT(*) AS total
       FROM course_lessons
       JOIN course_modules ON course_modules.id = course_lessons.module_id
       WHERE course_lessons.status = 'active' AND course_modules.status = 'active'
       GROUP BY course_modules.space_id`
    )
    .all() as { space_id: number; total: number }[];
  return new Map(rows.map((row) => [row.space_id, row.total]));
}

/* ---------------------------------------------------- comentario e favorito */

export type LessonComment = {
  id: number;
  lesson_id: number;
  author_type: string;
  author_id: number;
  author_name: string;
  body: string;
  created_at: string;
};

export function getLessonComments(lessonId: number): LessonComment[] {
  return db
    .prepare(
      `SELECT lesson_comments.id,
              lesson_comments.lesson_id,
              lesson_comments.author_type,
              lesson_comments.author_id,
              CASE lesson_comments.author_type
                WHEN 'admin' THEN 'Premium Member'
                ELSE COALESCE(affiliates.name, 'Membro removido')
              END AS author_name,
              lesson_comments.body,
              lesson_comments.created_at
       FROM lesson_comments
       LEFT JOIN affiliates
         ON affiliates.id = lesson_comments.author_id
        AND lesson_comments.author_type = 'member'
       WHERE lesson_comments.lesson_id = ? AND lesson_comments.status = 'published'
       ORDER BY lesson_comments.created_at, lesson_comments.id`
    )
    .all(lessonId) as LessonComment[];
}

export function createLessonComment(input: {
  lessonId: number;
  authorType: "member" | "admin";
  authorId: number;
  body: string;
}) {
  const result = db
    .prepare(
      "INSERT INTO lesson_comments (lesson_id, author_type, author_id, body) VALUES (?, ?, ?, ?)"
    )
    .run(input.lessonId, input.authorType, input.authorId, input.body);
  return Number(result.lastInsertRowid);
}

export function toggleLessonFavorite(lessonId: number, affiliateId: number) {
  const existe = db
    .prepare("SELECT 1 FROM lesson_favorites WHERE lesson_id = ? AND affiliate_id = ?")
    .get(lessonId, affiliateId);

  if (existe) {
    db.prepare("DELETE FROM lesson_favorites WHERE lesson_id = ? AND affiliate_id = ?").run(
      lessonId,
      affiliateId
    );
    return false;
  }

  db.prepare("INSERT INTO lesson_favorites (lesson_id, affiliate_id) VALUES (?, ?)").run(
    lessonId,
    affiliateId
  );
  return true;
}

export function isLessonFavorite(lessonId: number, affiliateId: number) {
  return Boolean(
    db
      .prepare("SELECT 1 FROM lesson_favorites WHERE lesson_id = ? AND affiliate_id = ?")
      .get(lessonId, affiliateId)
  );
}

export type FavoriteLesson = {
  id: number;
  title: string;
  slug: string;
  space_name: string;
  space_slug: string;
  module_title: string;
};

/**
 * As aulas salvas do membro. A elegibilidade entra na consulta: se o curso
 * ficar travado depois, a aula salva some da lista em vez de virar um link que
 * bloqueia na cara dele.
 */
export function getFavoriteLessons(affiliateId: number, eligibleSales: number): FavoriteLesson[] {
  return db
    .prepare(
      `SELECT course_lessons.id,
              course_lessons.title,
              course_lessons.slug,
              course_modules.title AS module_title,
              community_spaces.name AS space_name,
              community_spaces.slug AS space_slug
       FROM lesson_favorites
       JOIN course_lessons ON course_lessons.id = lesson_favorites.lesson_id
       JOIN course_modules ON course_modules.id = course_lessons.module_id
       JOIN community_spaces ON community_spaces.id = course_modules.space_id
       WHERE lesson_favorites.affiliate_id = ?
         AND course_lessons.status = 'active'
         AND course_modules.status = 'active'
         AND community_spaces.status = 'active'
         AND course_lessons.min_eligible_sales <= ?
         AND community_spaces.min_eligible_sales <= ?
       ORDER BY lesson_favorites.created_at DESC`
    )
    .all(affiliateId, eligibleSales, eligibleSales) as FavoriteLesson[];
}

/* ------------------------------------------------------------- em breve ---- */

export const moduleStatuses = [
  { value: "active", label: "Publicado" },
  { value: "coming_soon", label: "Em breve (aparece fechado)" },
  { value: "archived", label: "Arquivado (some da trilha)" },
] as const;

export type ModuleStatus = (typeof moduleStatuses)[number]["value"];

export function isModuleStatus(value: string): value is ModuleStatus {
  return moduleStatuses.some((item) => item.value === value);
}

export function setModuleStatusValue(moduleId: number, status: ModuleStatus) {
  db.prepare("UPDATE course_modules SET status = ? WHERE id = ?").run(status, moduleId);
}

/** Os modulos "Em breve" do curso: aparecem na trilha, sem aula e sem link. */
export function getComingSoonModules(spaceId: number) {
  return db
    .prepare(
      `SELECT id, title FROM course_modules
       WHERE space_id = ? AND status = 'coming_soon'
       ORDER BY position, id`
    )
    .all(spaceId) as { id: number; title: string }[];
}
