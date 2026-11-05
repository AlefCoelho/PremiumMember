import { createCommunityPostAction } from "@/app/socio/comunidade/actions";
import { CommunityPostCard } from "@/components/CommunityPostCard";
import { ImageUploadField } from "@/components/ImageUploadField";
import { requireAffiliate } from "@/lib/auth";
import { getAvatarUrls } from "@/lib/profiles";
import { publicUrl } from "@/lib/storage";
import {
  attachPostMeta,
  evaluateSpaceAccess,
  formatReleaseMoment,
  getAffiliateJoinDate,
  getGrantedSpaceIds,
  getMemberEligibleSales,
  getPostImagePaths,
  getSpaceBySlug,
  getSpacePosts,
  type SpaceAccess,
} from "@/lib/community";
import { Clock, Lock, TrendingUp } from "lucide-react";
import Link from "next/link";
import { CourseTrail } from "@/components/CourseTrail";
import {
  getComingSoonModules,
  getCourseSummary,
  getLessonPresentationMap,
  getMemberCourse,
} from "@/lib/lessons";
import { notFound } from "next/navigation";

const kindLabel: Record<string, string> = {
  posts: "Discussao",
  support: "Suporte",
  lessons: "Aulas",
};

/**
 * A tela de espaco bloqueado.
 *
 * Cada motivo pede uma saida diferente, e e por isso que sao tres telas e nao
 * uma com o texto trocado: quem falta venda tem o que fazer agora, quem espera
 * data nao tem nada a fazer, e quem precisa pagar precisa do botao. Oferecer a
 * saida errada e pior que nao oferecer nenhuma.
 */
function SpaceGate({ access }: { access: Extract<SpaceAccess, { ok: false }> }) {
  if (access.motivo === "vendas") {
    return (
      <div className="panel space-gate">
        <span className="space-gate-icon">
          <TrendingUp size={22} />
        </span>
        <strong>Este espaco abre com {access.exigido} venda(s) liberada(s).</strong>
        <p>
          Faltam {access.faltam}. Indique pelo seu link e, assim que a venda sair da carencia, este
          espaco aparece aberto aqui.
        </p>
        <Link className="primary-button" href="/socio/ganhos">
          Ver meu link de indicacao
        </Link>
      </div>
    );
  }

  if (access.motivo === "agenda") {
    return (
      <div className="panel space-gate">
        <span className="space-gate-icon">
          <Clock size={22} />
        </span>
        <strong>Conteudo liberado em {formatReleaseMoment(access.liberaEm)}.</strong>
        <p>
          Ja esta tudo preparado aqui dentro. Na data e hora acima este espaco abre sozinho, sem
          voce precisar fazer nada.
        </p>
      </div>
    );
  }

  return (
    <div className="panel space-gate premium">
      <span className="space-gate-icon">
        <Lock size={22} />
      </span>
      <strong>Conteudo Premium.</strong>
      <p>{access.pitch || "Libere o acesso para entrar neste espaco."}</p>
      {access.checkoutUrl ? (
        <>
          {/* rel="noreferrer" porque o destino e um checkout de terceiro: nao
              passo o endereco da area de membro para fora. */}
          <a
            className="primary-button"
            href={access.checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Liberar acesso
            {access.priceLabel ? ` - ${access.priceLabel}` : ""}
          </a>
          <p className="muted">
            Depois do pagamento, o acesso e liberado pela equipe. Se ja pagou e ainda esta vendo
            esta tela, fale no suporte.
          </p>
        </>
      ) : (
        <p className="muted">O link de pagamento ainda nao foi configurado. Fale no suporte.</p>
      )}
    </div>
  );
}

export default async function CommunitySpacePage({
  params,
  searchParams,
}: {
  params: Promise<{ space: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const session = await requireAffiliate();
  const { space: spaceSlug } = await params;
  const { erro } = await searchParams;
  const space = getSpaceBySlug(spaceSlug);
  if (!space) notFound();

  const eligibleSales = getMemberEligibleSales(session.affiliateId);
  const acesso = evaluateSpaceAccess({
    spaceId: space.id,
    groupId: space.group_id,
    minEligibleSales: space.min_eligible_sales,
    eligibleSales,
    joinedAt: getAffiliateJoinDate(session.affiliateId),
    granted: getGrantedSpaceIds(session.affiliateId).has(space.id),
  });

  if (!acesso.ok) {
    return (
      <>
        <header className="community-header">
          <div>
            <p className="eyebrow">{kindLabel[space.kind] ?? "Espaco"}</p>
            <h1>{space.name}</h1>
            {space.description ? <p>{space.description}</p> : null}
          </div>
        </header>
        <SpaceGate access={acesso} />
      </>
    );
  }

  // Espaco de aulas nao e feed: e trilha. O membro vem aqui para assistir, nao
  // para publicar, entao o compositor nem aparece.
  if (space.kind === "lessons") {
    const course = getMemberCourse(space.id, session.affiliateId, eligibleSales);

    return (
      <>
        <header className="community-header">
          <div>
            <p className="eyebrow">{kindLabel.lessons}</p>
            <h1>{space.name}</h1>
            <p>{space.description}</p>
          </div>
        </header>

        <CourseTrail
          modules={course.modules}
          total={course.total}
          completed={course.completed}
          eligibleSales={eligibleSales}
          summary={getCourseSummary(space.id)}
          presentation={getLessonPresentationMap(
            course.modules.flatMap((modulo) => modulo.lessons.map((aula) => aula.id))
          )}
          comingSoon={getComingSoonModules(space.id)}
        />
      </>
    );
  }

  const posts = attachPostMeta(getSpacePosts(space.id), session.affiliateId);
  const avatars = getAvatarUrls(posts.map((post) => post.author_id));
  const images = getPostImagePaths(posts.map((post) => post.id));

  return (
    <>
      <header className="community-header">
        <div>
          <p className="eyebrow">{kindLabel[space.kind] ?? "Espaco"}</p>
          <h1>{space.name}</h1>
          <p>{space.description}</p>
        </div>
      </header>

      <section className="panel community-composer">
        <form action={createCommunityPostAction} className="stack">
          <input type="hidden" name="space_slug" value={space.slug} />
          <label>
            Titulo
            <input name="title" placeholder="Sobre o que voce quer falar?" maxLength={160} required />
          </label>
          <label>
            Mensagem
            <textarea name="body" rows={4} placeholder="Escreva aqui..." maxLength={8000} required />
          </label>
          <ImageUploadField name="image" label="Adicionar imagem" />
          {erro === "link" ? (
            <p className="form-error">
              Link externo nao e permitido na comunidade. Tire o endereco e publique de novo.
            </p>
          ) : null}
          <button className="primary-button" type="submit">
            Publicar
          </button>
        </form>
      </section>

      <section className="community-feed">
        {posts.length ? (
          posts.map((post) => (
            <CommunityPostCard
              key={post.id}
              post={post}
              avatarUrl={post.author_type === "member" ? avatars.get(post.author_id) : null}
              imageUrl={publicUrl(images.get(post.id))}
            />
          ))
        ) : (
          <div className="panel community-empty">
            <strong>Nenhuma publicacao neste espaco.</strong>
            <p>Seja o primeiro a publicar aqui.</p>
          </div>
        )}
      </section>
    </>
  );
}
