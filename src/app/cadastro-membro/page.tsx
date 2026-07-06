import Link from "next/link";
import { publicAffiliateSignupAction } from "@/app/actions";
import { getAffiliateSession } from "@/lib/auth";
import { getAffiliateByCode } from "@/lib/db";
import { redirect } from "next/navigation";

export default async function PublicAffiliateSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sponsor?: string }>;
}) {
  const session = await getAffiliateSession();
  if (session) redirect("/socio");
  const params = await searchParams;
  const sponsorCode = String(params.sponsor ?? "").trim().toUpperCase();
  const sponsor = sponsorCode ? getAffiliateByCode(sponsorCode) : null;

  return (
    <main className="login-page">
      <section className="login-panel member-signup-panel">
        <div>
          <p className="eyebrow">Premium Member</p>
          <h1>Cadastro de membro</h1>
          <p className="muted">
            Preencha seus dados e crie uma senha para acessar sua dashboard de membro.
          </p>
        </div>

        <form action={publicAffiliateSignupAction} className="stack">
          <label>
            Nome completo
            <input name="name" placeholder="Seu nome" autoComplete="name" required />
          </label>
          <label>
            E-mail
            <input name="email" type="email" placeholder="seu@email.com" autoComplete="email" required />
          </label>
          <label>
            WhatsApp
            <input name="phone" placeholder="+55..." autoComplete="tel" />
          </label>
          <label>
            Senha de acesso
            <input name="password" type="password" minLength={6} autoComplete="new-password" required />
          </label>
          <label>
            Confirmar senha
            <input name="password_confirm" type="password" minLength={6} autoComplete="new-password" required />
          </label>
          <input name="sponsor" type="hidden" value={sponsor?.code ?? sponsorCode} />
          {sponsor ? (
            <div className="success-banner inline-banner">Voce esta entrando pela rede de {sponsor.name}.</div>
          ) : null}
          {params.error === "email" ? (
            <p className="form-error">Este e-mail ja esta cadastrado. Entre pelo login de membro usando sua senha.</p>
          ) : null}
          {params.error === "password" ? (
            <p className="form-error">A senha precisa ter pelo menos 6 caracteres e a confirmacao precisa ser igual.</p>
          ) : null}
          {params.error === "sponsor" ? (
            <p className="form-error">Link de patrocinador invalido. Solicite um novo link ao membro que indicou voce.</p>
          ) : null}
          <button className="primary-button" type="submit">
            Criar minha dashboard
          </button>
        </form>

        <p className="form-help member-signup-footer">
          Ja tem cadastro? <Link href="/socio/login">Entrar no portal de membro</Link>
        </p>
      </section>
    </main>
  );
}
