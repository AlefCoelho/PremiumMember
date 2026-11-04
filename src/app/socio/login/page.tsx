import { affiliateLoginAction } from "@/app/actions";
import { getAffiliateSession } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AffiliateLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; senha?: string }>;
}) {
  const session = await getAffiliateSession();
  if (session) redirect("/socio");
  const params = await searchParams;

  return (
    <main className="login-page">
      <section className="login-panel">
        <div>
          <p className="eyebrow">Portal Premium Member</p>
          <h1>Area de Membros</h1>
          <p className="muted">
            Recursos Premium, aulas exclusivas e comunidade de membros,{" "}
            <span className="gold-shine">E muito mais Além.</span>
          </p>
        </div>

        <form action={affiliateLoginAction} className="stack">
          <label>
            E-mail cadastrado
            <input name="email" type="email" placeholder="seu@email.com" required />
          </label>
          <label>
            Senha
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          {params.error ? <p className="form-error">E-mail ou senha invalidos.</p> : null}
          {params.senha === "redefinida" ? (
            <div className="success-banner inline-banner">
              Senha alterada. Entre com a senha nova.
            </div>
          ) : null}
          <button className="primary-button" type="submit">
            Entrar no portal
          </button>
        </form>
        <p className="form-help member-signup-footer">
          <Link href="/socio/recuperar-senha">Esqueci minha senha</Link>
        </p>
        <p className="form-help member-signup-footer">
          Ainda nao tem cadastro? <Link href="/cadastro-membro">Criar cadastro de membro</Link>
        </p>
      </section>
    </main>
  );
}
