import Link from "next/link";
import { requestPasswordResetAction } from "@/app/socio/senha/actions";
import { isMailConfigured, TOKEN_TTL_MINUTES } from "@/lib/password-reset";

export default async function RecuperarSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string; error?: string }>;
}) {
  const params = await searchParams;
  const mail = isMailConfigured();

  return (
    <main className="login-page">
      <section className="login-panel">
        <div>
          <p className="eyebrow">Portal Premium Member</p>
          <h1>Recuperar senha</h1>
          <p className="muted">
            Informe o e-mail do seu cadastro e enviaremos um link para criar uma senha nova.
          </p>
        </div>

        {params.enviado ? (
          <div className="success-banner inline-banner">
            Se esse e-mail estiver cadastrado, o link de redefinicao ja foi gerado. Ele vale por{" "}
            {TOKEN_TTL_MINUTES} minutos.
            {mail ? null : " Procure o suporte para receber o link."}
          </div>
        ) : (
          <form action={requestPasswordResetAction} className="stack">
            <label>
              E-mail cadastrado
              <input name="email" type="email" placeholder="seu@email.com" autoComplete="email" required />
            </label>
            {params.error === "email" ? (
              <p className="form-error">Informe o e-mail do seu cadastro.</p>
            ) : null}
            <button className="primary-button" type="submit">
              Enviar link de redefinicao
            </button>
          </form>
        )}

        <p className="form-help member-signup-footer">
          Lembrou a senha? <Link href="/socio/login">Entrar no portal de membro</Link>
        </p>
      </section>
    </main>
  );
}
