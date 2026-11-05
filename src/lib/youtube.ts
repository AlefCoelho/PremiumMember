/**
 * A miniatura que o YouTube ja gera para todo video.
 *
 * Serve de capa do curso e de miniatura da aula, no lugar de imagem enviada
 * pelo admin: nao ocupa disco da VPS, nao exige upload a cada aula nova e
 * acompanha sozinha a troca da capa no YouTube.
 *
 * Mora num arquivo proprio, e nao em lessons.ts, porque o trilho da aula roda
 * no navegador — e lessons.ts carrega o better-sqlite3, que nao pode entrar no
 * pacote do cliente. Aqui nao ha dependencia nenhuma, entao serve aos dois
 * lados.
 *
 * O dominio e i.ytimg.com, que o Google usa justamente para estatico sem
 * cookie: a imagem nao identifica quem esta vendo.
 *
 * `mqdefault` (320x180) para a lista; `hqdefault` (480x360) para a vitrine,
 * que exibe maior. Os dois existem para qualquer video, inclusive nao listado;
 * `maxresdefault` nao, e virava quadrado quebrado quando faltava. O hqdefault
 * vem em 4:3 com tarja preta, mas os dois lugares que o exibem sao 16:9 com
 * `object-fit: cover`, entao a tarja e cortada e sobra o quadro do video.
 */
export function youtubeThumb(
  provider: string,
  videoId: string,
  tamanho: "capa" | "miniatura" = "miniatura"
) {
  if (provider !== "youtube" || !videoId) return "";
  return `https://i.ytimg.com/vi/${videoId}/${tamanho === "capa" ? "hqdefault" : "mqdefault"}.jpg`;
}
