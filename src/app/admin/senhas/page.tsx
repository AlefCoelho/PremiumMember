import { GraduationCap, KeyRound, LayoutDashboard, LogOut, MessagesSquare } from "lucide-react";
import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { adminCreateResetLinkAction } from "@/app/socio/senha/actions";
import { requireAdmin } from "@/lib/auth";
import { getAffiliateById, getAffiliateSummaries } from "@/lib/db";
import { buildResetLink, isMailConfigured, TOKEN_TTL_MINUTES } from "@/lib/password-reset";

export default async function AdminPasswordsPage({
  searchParams,
}: {
  searchParams: Promise<{ membro?: string; token?: string; enviado?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const affiliates = getAffiliateSummaries();
  const mail = isMailConfigured();

  const membroId = Number(params.membro ?? 0);
  const membro = Number.isInteger(membroId) && membroId > 0 ? getAffiliateById(membroId) : undefined;
  const link = params.token ? buildResetLink(params.token) : undefined;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">PM</div>
          <div>
            <strong>Premium Member</strong>
            <span>Senhas</span>
          </div>
        </div>

        <nav>
          <Link href="/">
            <LayoutDashboard size={18} />
            Painel de membros
          </Link>
          <Link href="/admin/comunidade">
            <MessagesSquare size={18} />
            Comunidade
          </Link>
          <Link href="/admin/aulas">
            <GraduationCap size={18} />
            Aulas
          </Link>
          <a className="active" href="#senhas">
            <KeyRound size={18} />
            Senhas
          </a>
        </nav>

        <form action={logoutAction} className="logout-form">
          <button type="submit">
            <LogOut size={18} />
            Sair
          </button>
        </form>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>Redefinicao de senha</h1>
            <p>
              {mail
                ? "O link e enviado por e-mail para o membro e tambem aparece aqui."
                : "Nenhum servico de e-mail esta configurado, entao o link aparece aqui para voce entregar ao membro."}
            </p>
          </div>
        </header>

        {link && membro ? (
          <section className="panel" id="link-gerado">
            <div className="panel-header">
              <div>
                <h2>Link para {membro.name}</h2>
                <p>
                  Vale por {TOKEN_TTL_MINUTES} minutos e so pode ser usado uma vez. Gerar outro link
                  cancela este.
                  {params.enviado === "1" ? " Tambem foi enviado por e-mail." : null}
                  {params.enviado === "falhou"
                    ? " O envio por e-mail falhou, entregue o link por outro canal."
                    : null}
                </p>
              </div>
            </div>
            <p className="mono-value" style={{ maxWidth: "100%", whiteSpace: "normal" }}>
              {link}
            </p>
            <p className="muted">
              Entregue por um canal privado. Quem tiver este link consegue trocar a senha do membro
              ate ele expirar.
            </p>
          </section>
        ) : null}

        <section className="panel" id="senhas">
          <div className="panel-header">
            <div>
              <h2>Membros</h2>
              <p>Gere um link quando o membro perder a senha e nao conseguir entrar.</p>
            </div>
          </div>
          <div className="table-wrap compact">
            <table>
              <thead>
                <tr>
                  <th>Membro</th>
                  <th>Codigo</th>
                  <th>Acesso</th>
                  <th>Acao</th>
                </tr>
              </thead>
              <tbody>
                {affiliates.length ? (
                  affiliates.map((affiliate) => (
                    <tr key={affiliate.id}>
                      <td>
                        <strong>{affiliate.name}</strong>
                        <span>{affiliate.email}</span>
                      </td>
                      <td>{affiliate.code}</td>
                      <td>
                        <span className={affiliate.status === "active" ? "badge success" : "badge neutral"}>
                          {affiliate.status === "active" ? "Ativo" : affiliate.status}
                        </span>
                      </td>
                      <td>
                        <form action={adminCreateResetLinkAction}>
                          <input type="hidden" name="affiliate_id" value={affiliate.id} />
                          <button className="outline-button" type="submit">
                            <KeyRound size={14} />
                            Gerar link
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="empty-row">
                      Nenhum membro cadastrado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}
