import Link from "next/link";
import { submitAdminNewPasswordAction } from "@/app/login/senha/actions";
import { ADMIN_MIN_PASSWORD, checkAdminToken } from "@/lib/admin-reset";

const motivos: Record<string, string> = {
  invalid: "Este link nao e valido. Peca um novo link.",
  expired: "Este link expirou. Peca um novo link.",
  used: "Este link ja foi usado. Peca um novo se precisar trocar a senha de novo.",
  curta: `A senha precisa de pelo menos ${ADMIN_MIN_PASSWORD} caracteres.`,
  diferente: "A confirmacao nao bate com a senha nova.",
};

export default async function RedefinirSenhaAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; erro?: string }>;
}) {
  const params = await searchParams;
  const token = String(params.token ?? "");
  const check = checkAdminToken(token);

  if (!check.ok) {
    return (
      <main className="login-page">
        <section className="login-panel">
          <div>
            <p className="eyebrow">Premium Member</p>
            <h1>Link invalido</h1>
            <p className="muted">{motivos[check.reason] ?? motivos.invalid}</p>
          </div>
          <Link className="primary-button" href="/login/esqueci-senha">
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
          <p className="eyebrow">Premium Member</p>
          <h1>Nova senha do painel</h1>
          <p className="muted">Escolha a senha que vai usar daqui para frente.</p>
        </div>

        <form action={submitAdminNewPasswordAction} className="stack">
          <input type="hidden" name="token" value={token} />
          <label>
            Nova senha
            <input
              name="senha"
              type="password"
              minLength={ADMIN_MIN_PASSWORD}
              autoComplete="new-password"
              required
            />
          </label>
          <label>
            Confirmar senha
            <input
              name="senha_confirma"
              type="password"
              minLength={ADMIN_MIN_PASSWORD}
              autoComplete="new-password"
              required
            />
          </label>
          {params.erro ? <p className="form-error">{motivos[params.erro] ?? motivos.invalid}</p> : null}
          <button className="primary-button" type="submit">
            Salvar nova senha
          </button>
        </form>
      </section>
    </main>
  );
}
