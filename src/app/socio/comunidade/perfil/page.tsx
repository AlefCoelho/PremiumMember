import {
  removeAvatarAction,
  updateAvatarAction,
  updateProfileInfoAction,
} from "@/app/socio/comunidade/actions";
import { ImageUploadField } from "@/components/ImageUploadField";
import { requireAffiliate } from "@/lib/auth";
import { getAffiliateById } from "@/lib/db";
import { areasSugeridas, getAvatarUrl, getProfileInfo, redes } from "@/lib/profiles";
import Link from "next/link";

const erros: Record<string, string> = {
  vazio: "Escolha uma imagem antes de salvar.",
  tipo: "Formato nao aceito. Envie PNG, JPG ou WebP.",
  tamanho: "A imagem ficou maior que 2 MB mesmo depois de reduzida. Tente outra.",
  link: "Link externo nao e permitido no perfil. Tire o endereco e salve de novo.",
};

export default async function CommunityProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string; removido?: string; perfil?: string }>;
}) {
  const session = await requireAffiliate();
  const params = await searchParams;
  const affiliate = getAffiliateById(session.affiliateId);
  const avatarUrl = getAvatarUrl(session.affiliateId);
  const info = getProfileInfo(session.affiliateId);

  return (
    <>
      <header className="community-header">
        <div>
          <p className="eyebrow">Minha area</p>
          <h1>Meu perfil</h1>
          <p>
            Isto e o que os outros membros veem quando abrem o seu nome na lista de membros.
          </p>
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

          {params.perfil ? (
            <div className="success-banner inline-banner">Perfil atualizado.</div>
          ) : null}

          <form action={updateAvatarAction} className="stack">
            <ImageUploadField
              name="avatar"
              label={avatarUrl ? "Trocar foto" : "Escolher foto"}
              maxSide={400}
              quadrada
              currentUrl={avatarUrl}
            />
            <p className="muted">
              A imagem e recortada em quadrado e reduzida no seu proprio navegador antes de subir,
              com o corte um pouco acima do centro para o rosto nao ficar cortado.
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

        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Area de atuacao e apresentacao</h2>
              <p>
                O que voce escrever aqui aparece no seu perfil publico, para os outros membros
                saberem com quem estao falando.
              </p>
            </div>
          </div>

          <form action={updateProfileInfoAction} className="stack">
            <label>
              Chamada
              <input
                name="headline"
                defaultValue={info.headline}
                placeholder="Ex.: Construindo minha rede com trafego pago"
                maxLength={100}
              />
              <span className="form-help">
                Uma frase que aparece logo abaixo do seu nome, na lista e no seu perfil.
              </span>
            </label>

            <div className="split-fields">
              <label>
                Em que area voce atua
                {/* Lista de sugestoes com <datalist>, nao <select>: ninguem
                    acerta de antemao todas as areas, e um menu fechado forcaria
                    o membro a escolher algo que nao e o dele. */}
                <input
                  name="area"
                  list="areas-sugeridas"
                  defaultValue={info.area}
                  placeholder="Ex.: Trafego pago"
                  maxLength={80}
                />
              </label>
              <label>
                Cidade e estado
                <input
                  name="location"
                  defaultValue={info.location}
                  placeholder="Ex.: Fortaleza, CE"
                  maxLength={80}
                />
              </label>
            </div>
            <datalist id="areas-sugeridas">
              {areasSugeridas.map((area) => (
                <option value={area} key={area} />
              ))}
            </datalist>

            <label>
              Sua apresentacao
              <textarea
                name="bio"
                rows={4}
                defaultValue={info.bio}
                placeholder="Conte em poucas linhas o que voce faz e o que busca aqui."
                maxLength={400}
              />
            </label>

            <fieldset className="perfil-redes">
              <legend>Suas redes</legend>
              <p className="muted">
                So o nome de usuario, sem o endereco completo. Se colar o link inteiro, a gente
                tira o usuario dele.
              </p>
              {redes.map((rede) => (
                <label key={rede.chave}>
                  {rede.label}
                  <span className="perfil-rede-campo">
                    <em>{rede.base.replace("https://", "")}</em>
                    <input
                      name={rede.chave}
                      defaultValue={info[rede.chave]}
                      placeholder="seuusuario"
                      maxLength={120}
                    />
                  </span>
                </label>
              ))}
            </fieldset>

            <label className="checkbox-field">
              <input
                type="checkbox"
                name="listed"
                value="1"
                defaultChecked={info.listed === 1}
              />
              Mostrar meu perfil na lista de membros
            </label>
            <span className="form-help">
              Desligado, voce some da lista e do ranking. Suas publicacoes e comentarios continuam
              aparecendo normalmente, com seu nome e sua foto.
            </span>

            <button className="primary-button" type="submit">
              Salvar perfil
            </button>
          </form>

          <Link className="outline-button" href={`/socio/comunidade/membros/${session.affiliateId}`}>
            Ver meu perfil como os outros veem
          </Link>
        </div>
      </section>
    </>
  );
}
