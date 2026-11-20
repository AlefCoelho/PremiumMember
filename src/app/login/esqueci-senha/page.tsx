import Link from "next/link";
import { redirect } from "next/navigation";
import { requestAdminResetAction } from "@/app/login/senha/actions";
import { getSession } from "@/lib/auth";
import { ADMIN_TOKEN_TTL_MINUTES } from "@/lib/admin-reset";

export default async function EsqueciSenhaAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string; erro?: string; "sem-email"?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/admin/senhas");
  const params = await searchParams;

  return (
    <main className="login-page">
      <section className="login-panel">
        <div>
          <p className="eyebrow">Premium Member</p>
          <h1>Esqueci a senha</h1>
          <p className="muted">
            Informe o e-mail do administrador. Se ele existir, enviamos um link para criar uma
            senha nova.
          </p>
        </div>

        {params.enviado ? (
          <p className="muted">
            Se esse e-mail for de um administrador, o link ja esta a caminho. Ele vale por{" "}
            {ADMIN_TOKEN_TTL_MINUTES} minutos e so pode ser usado uma vez. Confira tambem a caixa
            de spam.
          </p>
        ) : null}

        {params["sem-email"] ? (
          <p className="form-error">
            O envio de e-mail ainda nao esta configurado neste sistema, entao nenhum link pode ser
            enviado. Use o guia <code>scripts/SENHA-ADMIN.md</code> do repositorio para trocar a
            senha pela VPS.
          </p>
        ) : null}

        <form action={requestAdminResetAction} className="stack">
          <label>
            E-mail do administrador
            <input name="email" type="email" autoComplete="email" required />
          </label>
          {params.erro ? <p className="form-error">Informe o e-mail.</p> : null}
          <button className="primary-button" type="submit">
            Enviar link
          </button>
        </form>

        <Link className="login-alt-link" href="/login">
          Voltar ao login
        </Link>
      </section>
    </main>
  );
}
