import { db } from "@/lib/db";
import { deleteImage, publicUrl } from "@/lib/storage";

// Tabela a parte em vez de coluna nova em affiliates: o motor de afiliados
// continua intocado, e o deploy segue sem ALTER TABLE.
db.exec(`
CREATE TABLE IF NOT EXISTS affiliate_profiles (
  affiliate_id INTEGER PRIMARY KEY REFERENCES affiliates(id) ON DELETE CASCADE,
  avatar_path TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

// Tabela propria, e nao colunas novas em affiliate_profiles, pela mesma razao
// de sempre: o projeto nunca roda ALTER TABLE, e um CREATE TABLE IF NOT EXISTS
// sobe em producao sem migracao e sem risco para quem ja tem foto gravada.
db.exec(`
CREATE TABLE IF NOT EXISTS affiliate_profile_info (
  affiliate_id INTEGER PRIMARY KEY REFERENCES affiliates(id) ON DELETE CASCADE,
  area TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

// Terceira tabela, e nao colunas em affiliate_profile_info, porque aquela ja
// subiu para producao e aqui nunca se roda ALTER TABLE.
//
// `listed` comeca em 1: quem acabou de entrar aparece no diretorio, que e o
// que faz a comunidade parecer habitada. Quem nao quiser, desliga.
db.exec(`
CREATE TABLE IF NOT EXISTS affiliate_profile_extra (
  affiliate_id INTEGER PRIMARY KEY REFERENCES affiliates(id) ON DELETE CASCADE,
  headline TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  instagram TEXT NOT NULL DEFAULT '',
  linkedin TEXT NOT NULL DEFAULT '',
  twitter TEXT NOT NULL DEFAULT '',
  facebook TEXT NOT NULL DEFAULT '',
  listed INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

/**
 * As redes guardam o nome de usuario, nunca uma URL inteira.
 *
 * A comunidade recusa link externo em publicacao e em comentario. Cinco
 * campos de URL livre no perfil abririam exatamente a porta que essa regra
 * fecha — bastaria alguem colar ali o link de afiliado de outro programa e o
 * perfil viraria o anuncio que o feed nao deixa publicar.
 *
 * Guardando so o usuario, o destino e sempre o dominio da rede, montado por
 * nos. O membro mostra quem e; ninguem manda trafego para onde quiser.
 */
export const redes = [
  { chave: "instagram", label: "Instagram", base: "https://instagram.com/" },
  { chave: "linkedin", label: "LinkedIn", base: "https://linkedin.com/in/" },
  { chave: "twitter", label: "X (Twitter)", base: "https://x.com/" },
  { chave: "facebook", label: "Facebook", base: "https://facebook.com/" },
] as const;

export type RedeChave = (typeof redes)[number]["chave"];

/**
 * Limpa o que o membro digitou e devolve so o usuario.
 *
 * Aceita colagem de URL inteira porque e o que a pessoa tem na mao: copiou do
 * navegador e colou. Em vez de recusar, extrai o ultimo trecho do caminho.
 * O que nao casar com o formato de usuario vira vazio, e nao erro na cara.
 */
export function normalizarUsuario(valor: string) {
  let texto = valor.trim().replace(/^@+/, "");
  if (!texto) return "";

  if (/^https?:\/\//i.test(texto) || texto.includes("/")) {
    const partes = texto.replace(/[?#].*$/, "").replace(/\/+$/, "").split("/");
    texto = partes[partes.length - 1] ?? "";
  }

  return /^[A-Za-z0-9._-]{1,40}$/.test(texto) ? texto : "";
}

export type ProfileInfo = {
  area: string;
  bio: string;
  headline: string;
  location: string;
  instagram: string;
  linkedin: string;
  twitter: string;
  facebook: string;
  listed: number;
};

const emptyInfo: ProfileInfo = {
  area: "",
  bio: "",
  headline: "",
  location: "",
  instagram: "",
  linkedin: "",
  twitter: "",
  facebook: "",
  listed: 1,
};

export function getProfileInfo(affiliateId: number): ProfileInfo {
  const base = db
    .prepare("SELECT area, bio FROM affiliate_profile_info WHERE affiliate_id = ?")
    .get(affiliateId) as { area: string; bio: string } | undefined;

  const extra = db
    .prepare(
      `SELECT headline, location, instagram, linkedin, twitter, facebook, listed
       FROM affiliate_profile_extra WHERE affiliate_id = ?`
    )
    .get(affiliateId) as Omit<ProfileInfo, "area" | "bio"> | undefined;

  return { ...emptyInfo, ...base, ...extra };
}

/** Os perfis de uma lista de membros de uma vez, para a lista de membros. */
export function getProfileInfoMap(affiliateIds: number[]): Map<number, ProfileInfo> {
  const unicos = [...new Set(affiliateIds)].filter((id) => Number.isInteger(id) && id > 0);
  if (!unicos.length) return new Map();
  const marcas = unicos.map(() => "?").join(",");

  const base = db
    .prepare(
      `SELECT affiliate_id, area, bio FROM affiliate_profile_info WHERE affiliate_id IN (${marcas})`
    )
    .all(...unicos) as ({ affiliate_id: number } & Pick<ProfileInfo, "area" | "bio">)[];

  const extra = db
    .prepare(
      `SELECT affiliate_id, headline, location, instagram, linkedin, twitter, facebook, listed
       FROM affiliate_profile_extra WHERE affiliate_id IN (${marcas})`
    )
    .all(...unicos) as ({ affiliate_id: number } & Omit<ProfileInfo, "area" | "bio">)[];

  const mapa = new Map<number, ProfileInfo>(unicos.map((id) => [id, { ...emptyInfo }]));
  for (const linha of base) {
    const { affiliate_id, ...resto } = linha;
    mapa.set(affiliate_id, { ...mapa.get(affiliate_id)!, ...resto });
  }
  for (const linha of extra) {
    const { affiliate_id, ...resto } = linha;
    mapa.set(affiliate_id, { ...mapa.get(affiliate_id)!, ...resto });
  }
  return mapa;
}

export function setProfileInfo(affiliateId: number, input: ProfileInfo) {
  const gravar = db.transaction(() => {
    db.prepare(
      `INSERT INTO affiliate_profile_info (affiliate_id, area, bio, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT (affiliate_id) DO UPDATE SET
         area = excluded.area,
         bio = excluded.bio,
         updated_at = CURRENT_TIMESTAMP`
    ).run(affiliateId, input.area.slice(0, 80), input.bio.slice(0, 400));

    db.prepare(
      `INSERT INTO affiliate_profile_extra
         (affiliate_id, headline, location, instagram, linkedin, twitter, facebook, listed, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT (affiliate_id) DO UPDATE SET
         headline = excluded.headline,
         location = excluded.location,
         instagram = excluded.instagram,
         linkedin = excluded.linkedin,
         twitter = excluded.twitter,
         facebook = excluded.facebook,
         listed = excluded.listed,
         updated_at = CURRENT_TIMESTAMP`
    ).run(
      affiliateId,
      input.headline.slice(0, 100),
      input.location.slice(0, 80),
      normalizarUsuario(input.instagram),
      normalizarUsuario(input.linkedin),
      normalizarUsuario(input.twitter),
      normalizarUsuario(input.facebook),
      input.listed ? 1 : 0
    );
  });
  gravar();
}

/** As redes preenchidas de um perfil, prontas para exibir. */
export function redesDoPerfil(info: ProfileInfo) {
  return redes
    .map((rede) => ({ ...rede, usuario: info[rede.chave] }))
    .filter((rede) => rede.usuario)
    .map((rede) => ({ ...rede, url: `${rede.base}${rede.usuario}` }));
}

// As areas sugeridas sao uma lista, nao uma restricao: o campo aceita texto
// livre, porque ninguem acerta de antemao em que area um membro atua.
export const areasSugeridas = [
  "Marketing digital",
  "Trafego pago",
  "Copywriting",
  "Design",
  "Programacao",
  "Vendas",
  "Trading",
  "Financas",
  "Educacao",
  "Saude",
  "Advocacia",
  "Contabilidade",
  "Imoveis",
  "Comercio",
  "Servicos",
  "Estudante",
] as const;

export function getAvatarPath(affiliateId: number) {
  const row = db
    .prepare("SELECT avatar_path FROM affiliate_profiles WHERE affiliate_id = ?")
    .get(affiliateId) as { avatar_path: string } | undefined;
  return row?.avatar_path || null;
}

export function getAvatarUrl(affiliateId: number) {
  return publicUrl(getAvatarPath(affiliateId));
}

// Troca a foto e apaga a anterior, para nao acumular arquivo orfao no disco.
export function setAvatar(affiliateId: number, storedPath: string) {
  const previous = getAvatarPath(affiliateId);
  db.prepare(
    `INSERT INTO affiliate_profiles (affiliate_id, avatar_path, updated_at)
     VALUES (?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT (affiliate_id) DO UPDATE SET avatar_path = excluded.avatar_path, updated_at = CURRENT_TIMESTAMP`
  ).run(affiliateId, storedPath);
  if (previous && previous !== storedPath) deleteImage(previous);
}

export function removeAvatar(affiliateId: number) {
  const previous = getAvatarPath(affiliateId);
  db.prepare("UPDATE affiliate_profiles SET avatar_path = '' WHERE affiliate_id = ?").run(affiliateId);
  if (previous) deleteImage(previous);
}

// Busca as fotos de uma lista de autores de uma vez so.
export function getAvatarUrls(affiliateIds: number[]) {
  const unique = [...new Set(affiliateIds)].filter((id) => Number.isInteger(id) && id > 0);
  if (!unique.length) return new Map<number, string>();

  const rows = db
    .prepare(
      `SELECT affiliate_id, avatar_path FROM affiliate_profiles
       WHERE affiliate_id IN (${unique.map(() => "?").join(",")}) AND avatar_path != ''`
    )
    .all(...unique) as { affiliate_id: number; avatar_path: string }[];

  const map = new Map<number, string>();
  for (const row of rows) {
    const url = publicUrl(row.avatar_path);
    if (url) map.set(row.affiliate_id, url);
  }
  return map;
}
