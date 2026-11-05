import { createCommunityPostAction } from "@/app/socio/comunidade/actions";
import { CommunityPostCard } from "@/components/CommunityPostCard";
import { ImageUploadField } from "@/components/ImageUploadField";
import { requireAffiliate } from "@/lib/auth";
import { getAvatarUrls } from "@/lib/profiles";
import { publicUrl } from "@/lib/storage";
import {
  attachPostMeta,
  getMemberEligibleSales,
  getPostImagePaths,
  getSpaceBySlug,
  getSpacePosts,
} from "@/lib/community";
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

  if (space.min_eligible_sales > getMemberEligibleSales(session.affiliateId)) {
    return (
      <div className="panel community-empty">
        <strong>Espaco bloqueado.</strong>
        <p>
          Este espaco libera a partir de {space.min_eligible_sales} vendas liberadas. Continue indicando para
          desbloquear.
        </p>
      </div>
    );
  }

  // Espaco de aulas nao e feed: e trilha. O membro vem aqui para assistir, nao
  // para publicar, entao o compositor nem aparece.
  if (space.kind === "lessons") {
    const eligibleSales = getMemberEligibleSales(session.affiliateId);
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
