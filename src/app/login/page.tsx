import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { loginAction } from "@/app/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/");
  const params = await searchParams;
  const adminEmail = process.env.ADMIN_EMAIL ?? "";

  return (
    <main className="login-page">
      <section className="login-panel">
        <div>
          <p className="eyebrow">Premium Member</p>
          <h1>Acesso interno</h1>
          <p className="muted">
            Entre para gerenciar membros, indicacoes, pagamentos, carencia e saques.
          </p>
        </div>

        <form action={loginAction} className="stack">
          <label>
            E-mail
            <input name="email" type="email" defaultValue={adminEmail} required />
          </label>
          <label>
            Senha
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          {params.error ? <p className="form-error">Login invalido.</p> : null}
          <button className="primary-button" type="submit">
            Entrar no painel
          </button>
        </form>
      </section>
    </main>
  );
}
