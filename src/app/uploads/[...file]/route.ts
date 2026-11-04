import { NextRequest, NextResponse } from "next/server";
import { getAffiliateSession, getSession } from "@/lib/auth";
import { readImage } from "@/lib/storage";

// As imagens so sao servidas para quem esta logado, membro ou admin: sao fotos
// de pessoas e conteudo de area fechada, nao devem abrir para a internet.
export async function GET(request: NextRequest, context: { params: Promise<{ file: string[] }> }) {
  const [affiliate, admin] = await Promise.all([getAffiliateSession(), getSession()]);
  if (!affiliate && !admin) return new NextResponse(null, { status: 404 });

  const { file } = await context.params;
  const image = readImage(file.join("/"));
  if (!image) return new NextResponse(null, { status: 404 });

  return new NextResponse(new Uint8Array(image.bytes), {
    headers: {
      "content-type": image.contentType,
      // O nome do arquivo e aleatorio e nunca reaproveitado, entao o cache
      // longo nao corre risco de servir imagem trocada.
      "cache-control": "private, max-age=31536000, immutable",
    },
  });
}
