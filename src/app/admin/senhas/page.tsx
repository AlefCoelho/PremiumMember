import { GraduationCap, KeyRound, LayoutDashboard, LogOut, MessagesSquare } from "lucide-react";
import Link from "next/link";
import { logoutAction } from "@/app/actions";
import { adminCreateResetLinkAction } from "@/app/socio/senha/actions";
import { changeAdminPasswordAction } from "@/app/admin/senha/actions";
import { requireAdmin } from "@/lib/auth";
import { getAffiliateById, getAffiliateSummaries } from "@/lib/db";
import { buildResetLink, isMailConfigured, TOKEN_TTL_MINUTES } from "@/lib/password-reset";
import { BrandLogo } from "@/components/BrandLogo";

export default async function AdminPasswordsPage({
  searchParams,
}: {
  searchParams: Promise<{ membro?: string; token?: string; enviado?: string; senha?: string }>;
}) {
  const session = await requireAdmin();
  const params = await searchParams;
  const affiliates = getAffiliateSummaries();
  const mail = isMailConfigured();

  const membroId = Number(params.membro ?? 0);
  const membro = Number.isInteger(membroId) && membroId > 0 ? getAffiliateById(membroId) : undefined;
  const link = params.token ? buildResetLink(params.token) : undefined;

  const avisoSenha: Record<string, { tom: "ok" | "erro"; texto: string }> = {
    ok: { tom: "ok", texto: "Senha alterada. Ela ja vale no proximo login." },
    vazio: { tom: "erro", texto: "Preencha os tres campos." },
    curta: { tom: "erro", texto: "A senha nova precisa de pelo menos 8 caracteres." },
    diferente: { tom: "erro", texto: "A confirmacao nao bate com a senha nova." },
    atual: { tom: "erro", texto: "A senha atual esta errada." },
    igual: { tom: "erro", texto: "A senha nova e igual a atual. Nada foi alterado." },
    inexistente: { tom: "erro", texto: "Administrador nao encontrado." },
  };
  const aviso = params.senha ? avisoSenha[params.senha] : undefined;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <BrandLogo legenda="Senhas" />

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
            <h1>Senhas</h1>
            <p>
              Sua senha de administrador e os links de recuperacao dos membros.{" "}
              {mail
                ? "O link e enviado por e-mail para o membro e tambem aparece aqui."
                : "Nenhum servico de e-mail esta configurado, entao o link do membro aparece aqui para voce entregar."}
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

        <section className="panel" id="minha-senha">
          <div className="panel-header">
            <div>
              <h2>Minha senha de administrador</h2>
              <p>
                Trocar aqui e a unica forma de mudar a sua senha. Alterar{" "}
                <code>ADMIN_PASSWORD</code> no ambiente nao tem efeito depois que a conta existe.
              </p>
            </div>
          </div>

          {aviso ? (
            <p className={aviso.tom === "ok" ? "badge success" : "badge danger"}>{aviso.texto}</p>
          ) : null}

          <form action={changeAdminPasswordAction} className="senha-admin-form">
            <p className="muted">
              Conta: <strong>{session.email}</strong>
            </p>

            <label>
              Senha atual
              <input type="password" name="senha_atual" autoComplete="current-password" required />
            </label>

            <label>
              Senha nova
              <input
                type="password"
                name="senha_nova"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>

            <label>
              Repita a senha nova
              <input
                type="password"
                name="senha_confirma"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>

            <button className="primary-button" type="submit">
              <KeyRound size={16} />
              Trocar minha senha
            </button>
          </form>

          <p className="muted">
            Se voce perder esta senha e nao conseguir entrar, a recuperacao esta em{" "}
            <code>scripts/SENHA-ADMIN.md</code>, no repositorio: um comando na VPS.
          </p>
        </section>

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
