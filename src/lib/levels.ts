// Niveis do membro.
//
// Medidos por vendas liberadas acumuladas, nao por vendas do mes. A meta de 10
// em 30 dias e o que faz subir, mas o nivel conquistado nao cai no mes
// seguinte: rebaixar quem ficou doente ou viajou e o jeito mais rapido de
// fazer alguem parar de indicar. O ciclo de 30 dias continua valendo para o
// credito de acesso gratis, que e renovavel por natureza.

export const levels = [
  { nivel: 1, nome: "Iniciante", minimo: 0, cor: "neutro" },
  { nivel: 2, nome: "Bronze", minimo: 2, cor: "bronze" },
  { nivel: 3, nome: "Prata", minimo: 10, cor: "prata" },
  { nivel: 4, nome: "Ouro", minimo: 25, cor: "ouro" },
  { nivel: 5, nome: "Diamante", minimo: 50, cor: "diamante" },
  { nivel: 6, nome: "Lenda", minimo: 100, cor: "lenda" },
] as const;

export type Level = (typeof levels)[number];

export function levelFor(eligibleReferrals: number): Level {
  // De tras para frente: o primeiro que couber e o mais alto que couber.
  return [...levels].reverse().find((item) => eligibleReferrals >= item.minimo) ?? levels[0];
}

export function nextLevelFor(eligibleReferrals: number): Level | null {
  return levels.find((item) => item.minimo > eligibleReferrals) ?? null;
}

export function levelProgress(eligibleReferrals: number) {
  const atual = levelFor(eligibleReferrals);
  const proximo = nextLevelFor(eligibleReferrals);
  if (!proximo) return { atual, proximo: null, percent: 100, faltam: 0 };

  const faixa = proximo.minimo - atual.minimo;
  const andado = eligibleReferrals - atual.minimo;
  return {
    atual,
    proximo,
    percent: faixa > 0 ? Math.min(100, Math.round((andado / faixa) * 100)) : 0,
    faltam: proximo.minimo - eligibleReferrals,
  };
}

/** "3 meses", "1 ano e 2 meses" — o tempo de casa em palavras. */
export function membershipLength(iso: string, agora = new Date()) {
  const entrada = new Date(iso.replace(" ", "T"));
  if (Number.isNaN(entrada.getTime())) return "";

  const dias = Math.max(0, Math.floor((agora.getTime() - entrada.getTime()) / 86400000));
  if (dias < 1) return "entrou hoje";
  if (dias < 30) return `${dias} ${dias === 1 ? "dia" : "dias"}`;

  const meses = Math.floor(dias / 30);
  if (meses < 12) return `${meses} ${meses === 1 ? "mes" : "meses"}`;

  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  const parteAno = `${anos} ${anos === 1 ? "ano" : "anos"}`;
  if (!resto) return parteAno;
  return `${parteAno} e ${resto} ${resto === 1 ? "mes" : "meses"}`;
}
