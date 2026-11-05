import { db, getAffiliateSummaries } from "@/lib/db";

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

export function formatJoinDate(iso: string) {
  const data = new Date(iso.replace(" ", "T"));
  if (Number.isNaN(data.getTime())) return "";
  return data.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}
