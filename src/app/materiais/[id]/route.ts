import { NextRequest, NextResponse } from "next/server";
import { getAffiliateSession, getSession } from "@/lib/auth";
import { getMemberEligibleSales } from "@/lib/community";
import { memberCanOpenLesson, getLessonById, getLessonBySlug, getMaterialById } from "@/lib/lessons";
import { readMaterial } from "@/lib/storage";

// Download de material de aula.
//
// Nao reaproveita /uploads de proposito: aqui a elegibilidade e RECALCULADA a
// cada download. Sem isso, quem descobrisse o endereco baixaria o material de
// uma aula travada, e o travamento viraria enfeite da interface.
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const [affiliate, admin] = await Promise.all([getAffiliateSession(), getSession()]);
  if (!affiliate && !admin) return new NextResponse(null, { status: 404 });

  const { id } = await context.params;
  const material = getMaterialById(Number(id));
  if (!material || material.kind !== "file") return new NextResponse(null, { status: 404 });

  // O admin ve tudo: e ele quem cadastra. O membro passa pela regra da aula.
  if (!admin && affiliate) {
    const lesson = getLessonById(material.lesson_id);
    const entry = lesson ? getLessonBySlug(lesson.slug) : undefined;
    if (!entry) return new NextResponse(null, { status: 404 });

    const eligibleSales = getMemberEligibleSales(affiliate.affiliateId);
    if (!memberCanOpenLesson(entry, affiliate.affiliateId, eligibleSales))
      return new NextResponse(null, { status: 404 });
  }

  const file = readMaterial(material.stored_path);
  if (!file) return new NextResponse(null, { status: 404 });

  // Nome amigavel no download, sem deixar o rotulo do admin virar cabecalho
  // malformado: so o que e seguro, e o resto cai no nome generico.
  const safeLabel =
    material.label.replace(/[^\w .-]+/g, "_").slice(0, 80) || `material-${material.id}`;
  const filename = safeLabel.toLowerCase().endsWith(`.${file.extension}`)
    ? safeLabel
    : `${safeLabel}.${file.extension}`;

  return new NextResponse(new Uint8Array(file.bytes), {
    headers: {
      "content-type": file.contentType,
      "content-disposition": `attachment; filename="${filename}"`,
      // Privado: e conteudo de area fechada, nao pode ficar em cache de proxy.
      "cache-control": "private, max-age=0, must-revalidate",
    },
  });
}
