import Link from "next/link";
import { submitNewPasswordAction } from "@/app/socio/senha/actions";
import { checkResetToken } from "@/lib/password-reset";

const motivos: Record<string, string> = {
  invalid: "Este link nao e valido. Peca um novo link de redefinicao.",
  expired: "Este link expirou. Peca um novo link de redefinicao.",
  used: "Este link ja foi usado. Peca um novo se precisar trocar a senha de novo.",
};

export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const params = await searchParams;
  const token = String(params.token ?? "");
  const check = checkResetToken(token);

  if (!check.ok) {
    return (
      <main className="login-page">
        <section className="login-panel">
          <div>
            <p className="eyebrow">Portal Premium Member</p>
            <h1>Link invalido</h1>
            <p className="muted">{motivos[check.reason] ?? motivos.invalid}</p>
          </div>
          <Link className="primary-button" href="/socio/recuperar-senha">
            Pedir um link novo
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div>
          <p className="eyebrow">Portal Premium Member</p>
          <h1>Nova senha</h1>
          <p className="muted">Ola, {check.affiliateName}. Escolha a senha que vai usar daqui para frente.</p>
        </div>

        <form action={submitNewPasswordAction} className="stack">
          <input type="hidden" name="token" value={token} />
          <label>
            Nova senha
            <input name="password" type="password" minLength={6} autoComplete="new-password" required />
          </label>
          <label>
            Confirmar senha
            <input
              name="password_confirm"
              type="password"
              minLength={6}
              autoComplete="new-password"
              required
            />
          </label>
          {params.error === "password" ? (
            <p className="form-error">
              A senha precisa ter pelo menos 6 caracteres e a confirmacao precisa ser igual.
            </p>
          ) : null}
          {params.error && params.error !== "password" ? (
            <p className="form-error">{motivos[params.error] ?? motivos.invalid}</p>
          ) : null}
          <button className="primary-button" type="submit">
            Salvar nova senha
          </button>
        </form>
      </section>
    </main>
  );
}
