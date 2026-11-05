import { db, getAffiliateSummaries } from "@/lib/db";
// Importado tambem pelo efeito: lessons.ts cria course_lessons e
// lesson_progress, consultadas aqui. Sem o import, uma pagina que chegasse
// primeiro a este modulo quebraria na primeira consulta.
import "@/lib/lessons";
import { getProfileInfo } from "@/lib/profiles";

// Diretorio de membros e ranking.
//
// Nada aqui expõe e-mail, telefone, chave PIX ou valor em dinheiro de ninguem.
// O membro ve nome, data de entrada, quantas aulas concluiu e quantas vendas
// liberadas tem — o resto e assunto entre o membro e o painel dele.

export type DirectoryMember = {
  id: number;
  name: string;
  created_at: string;
  eligible_referrals: number;
  lessons_done: number;
};

function lessonsDoneByMember(): Map<number, number> {
  const rows = db
    .prepare(
      `SELECT affiliate_id, COUNT(*) AS total
       FROM lesson_progress
       GROUP BY affiliate_id`
    )
    .all() as { affiliate_id: number; total: number }[];
  return new Map(rows.map((row) => [row.affiliate_id, row.total]));
}

export function getMemberDirectory(): DirectoryMember[] {
  const feitas = lessonsDoneByMember();

  return getAffiliateSummaries()
    .filter((item) => item.status === "active")
    .map((item) => ({
      id: item.id,
      name: item.name,
      created_at: item.created_at,
      eligible_referrals: item.eligible_referrals,
      lessons_done: feitas.get(item.id) ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export type RankedMember = DirectoryMember & { position: number };

/**
 * O ranking. Ordena por vendas liberadas e, no empate, por aulas concluidas:
 * quem vende igual mas estuda mais aparece na frente.
 *
 * Quem tem zero em tudo fica de fora. Ranking cheio de zeros nao motiva
 * ninguem, e no comeco da comunidade a maioria esta zerada.
 */
export function getLeaderboard(limit = 20): RankedMember[] {
  return getMemberDirectory()
    .filter((item) => item.eligible_referrals > 0 || item.lessons_done > 0)
    .sort(
      (a, b) =>
        b.eligible_referrals - a.eligible_referrals ||
        b.lessons_done - a.lessons_done ||
        a.name.localeCompare(b.name, "pt-BR")
    )
    .slice(0, limit)
    .map((item, index) => ({ ...item, position: index + 1 }));
}

export type MemberProfile = DirectoryMember & {
  area: string;
  bio: string;
  courses_done: number;
  courses_total: number;
};

/**
 * O perfil publico de um membro.
 *
 * Mesma regra do diretorio: nada de e-mail, telefone, PIX ou dinheiro. O que
 * aparece aqui e o que o membro construiu (aulas, cursos, vendas liberadas,
 * tempo de casa) e o que ele mesmo escreveu (area e apresentacao).
 *
 * "Curso completo" e o espaco de aulas em que o membro concluiu todas as aulas
 * ativas. Curso sem aula nenhuma nao conta como completo — senao um curso vazio
 * daria ponto para todo mundo.
 */
export function getMemberProfile(affiliateId: number): MemberProfile | undefined {
  const membro = getMemberDirectory().find((item) => item.id === affiliateId);
  if (!membro) return undefined;

  const info = getProfileInfo(affiliateId);

  const cursos = db
    .prepare(
      `SELECT course_modules.space_id AS space_id,
              COUNT(course_lessons.id) AS total,
              SUM(CASE WHEN lesson_progress.lesson_id IS NULL THEN 0 ELSE 1 END) AS feitas
         FROM course_lessons
         JOIN course_modules ON course_modules.id = course_lessons.module_id
         LEFT JOIN lesson_progress
                ON lesson_progress.lesson_id = course_lessons.id
               AND lesson_progress.affiliate_id = ?
        WHERE course_lessons.status = 'active'
          AND course_modules.status = 'active'
        GROUP BY course_modules.space_id`
    )
    .all(affiliateId) as { space_id: number; total: number; feitas: number }[];

  return {
    ...membro,
    area: info.area,
    bio: info.bio,
    courses_total: cursos.length,
    courses_done: cursos.filter((curso) => curso.total > 0 && curso.feitas >= curso.total).length,
  };
}

export function formatJoinDate(iso: string) {
  const data = new Date(iso.replace(" ", "T"));
  if (Number.isNaN(data.getTime())) return "";
  return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}
