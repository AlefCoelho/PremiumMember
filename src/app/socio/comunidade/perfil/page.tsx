import { removeAvatarAction, updateAvatarAction } from "@/app/socio/comunidade/actions";
import { ImageUploadField } from "@/components/ImageUploadField";
import { requireAffiliate } from "@/lib/auth";
import { getAffiliateById } from "@/lib/db";
import { getAvatarUrl } from "@/lib/profiles";

const erros: Record<string, string> = {
  vazio: "Escolha uma imagem antes de salvar.",
  tipo: "Formato nao aceito. Envie PNG, JPG ou WebP.",
  tamanho: "A imagem ficou maior que 2 MB mesmo depois de reduzida. Tente outra.",
};

export default async function CommunityProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string; removido?: string }>;
}) {
  const session = await requireAffiliate();
  const params = await searchParams;
  const affiliate = getAffiliateById(session.affiliateId);
  const avatarUrl = getAvatarUrl(session.affiliateId);

  return (
    <>
      <header className="community-header">
        <div>
          <p className="eyebrow">Minha area</p>
          <h1>Meu perfil</h1>
          <p>Sua foto aparece nas suas publicacoes e comentarios.</p>
        </div>
      </header>

      <section className="community-feed">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>{affiliate?.name}</h2>
              <p>{affiliate?.email}</p>
            </div>
          </div>

          {params.ok ? <div className="success-banner inline-banner">Foto atualizada.</div> : null}
          {params.removido ? (
            <div className="success-banner inline-banner">Foto removida.</div>
          ) : null}
          {params.erro ? (
            <p className="form-error">{erros[params.erro] ?? erros.vazio}</p>
          ) : null}

          <form action={updateAvatarAction} className="stack">
            <ImageUploadField
              name="avatar"
              label={avatarUrl ? "Trocar foto" : "Escolher foto"}
              maxSide={400}
              currentUrl={avatarUrl}
            />
            <p className="muted">
              A imagem e reduzida no seu proprio navegador antes de subir. Acima de 2 MB ela e
              convertida para um formato menor automaticamente.
            </p>
            <button className="primary-button" type="submit">
              Salvar foto
            </button>
          </form>

          {avatarUrl ? (
            <form action={removeAvatarAction} className="stack">
              <button className="outline-button" type="submit">
                Remover foto
              </button>
            </form>
          ) : null}
        </div>
      </section>
    </>
  );
}
