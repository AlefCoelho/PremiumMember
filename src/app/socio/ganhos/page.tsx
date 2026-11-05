import {
  affiliateLogoutAction,
  affiliateRequestWithdrawalAction,
  affiliateUpdatePixKeyAction,
  affiliateUpdateWalletsAction,
} from "@/app/actions";
import { AffiliateLinkButton } from "@/components/AffiliateLinkButton";
import { requireAffiliate } from "@/lib/auth";
import { getAffiliateBaseUrl, getAffiliatePortalData } from "@/lib/db";
import { formatCurrency } from "@/lib/money";
import { levelProgress } from "@/lib/levels";
import { getHoldDeadline, getReferralStatus } from "@/lib/rules";
import { CalendarClock, HandCoins, Link2, LogOut, MessagesSquare, Trophy, Users, WalletCards } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

function dateLabel(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(
    new Date(`${value}T00:00:00`)
  );
}

function centsInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function statusLabel(referral: {
  paid_at: string | null;
  refunded_at: string | null;
  cancelled_at: string | null;
}, holdDays: number) {
  const status = getReferralStatus({ ...referral, holdDays });
  if (status === "eligible") return { label: "Liberada", className: "success" };
  if (status === "paid") return { label: "Carencia", className: "warning" };
  if (status === "blocked") return { label: "Bloqueada", className: "danger" };
  return { label: "Aguardando", className: "neutral" };
}

function PortalKpi({
  icon: Icon,
  label,
  value,
  detail,
  tone = "default",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "blue" | "green" | "amber";
}) {
  return (
    <article className={`kpi-card ${tone}`}>
      <div className="kpi-icon">
        <Icon size={20} />
      </div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{detail}</span>
      </div>
    </article>
  );
}

export default async function AffiliatePortalPage({
  searchParams,
}: {
  searchParams: Promise<{ cadastro?: string; saque?: string; pix?: string; wallets?: string }>;
}) {
  const session = await requireAffiliate();
  const data = getAffiliatePortalData(session.affiliateId);
  if (!data) redirect("/socio/login");
  const params = await searchParams;
  const memberSignupLink = `${getAffiliateBaseUrl()}/cadastro-membro?sponsor=${encodeURIComponent(data.affiliate.code)}`;

  // Os numeros da oferta vem das configuracoes, nao do texto: mudar a meta no
  // painel de admin tem de mudar a chamada que o membro le, senao a plataforma
  // promete uma coisa e entrega outra.
  const meta = data.settings.free_access_sales_target;
  const janela = data.settings.free_access_window_days;
  const nivel = levelProgress(data.stats.eligibleSales);
  const walletAddress = (network: string) => data.digitalWallets.find((wallet) => wallet.network === network)?.address ?? "";

  return (
    <main className="affiliate-portal">
      <header className="affiliate-hero">
        <div>
          <p className="eyebrow">Portal Premium Member</p>
          <h1>{data.affiliate.name}</h1>
          <p>Acompanhe indicacoes, comissoes e saques em um unico lugar.</p>
        </div>
        <div className="hero-actions">
          <Link className="primary-button" href="/socio/comunidade">
            <MessagesSquare size={16} />
            Voltar para a comunidade
          </Link>
          <form action={affiliateLogoutAction}>
            <button className="outline-button" type="submit">
              <LogOut size={16} />
              Sair
            </button>
          </form>
        </div>
      </header>

      {/* Um link so, em destaque. Tres links concorrendo na mesma tela nao dao
          tres vezes mais indicacoes: dao uma escolha a mais antes de agir, e a
          maioria nao escolhe nenhuma. O link do Premium Member e o unico que
          traz gente para dentro da plataforma. */}
      <section className="referral-hero panel">
        <div className="referral-hero-copy">
          <p className="eyebrow">Indique e use de graca</p>
          <h2>
            Indique {meta} novos membros e tenha acesso a todos os recursos Premium a cada{" "}
            {janela} dias.
          </h2>

          <ul className="referral-hero-list">
            <li>
              <strong>
                {meta} novos membros = 1 mes de Premium Member ilimitado
              </strong>
              <span>Enquanto voce mantiver o ritmo, nao paga mensalidade.</span>
            </li>
            <li>
              <strong>
                Mais {data.settings.network_bonus_percent}% de comissao sobre as vendas deles
              </strong>
              <span>De cada um dos membros que entrarem pelo seu link.</span>
            </li>
            <li>
              <strong>
                {nivel.proximo
                  ? `Mais ${nivel.faltam} venda(s) liberada(s) e voce sobe para o nivel ${nivel.proximo.nivel} - ${nivel.proximo.nome}`
                  : "Voce esta no nivel maximo"}
              </strong>
              <span>
                Hoje voce esta no nivel {nivel.atual.nivel} - {nivel.atual.nome}. O nivel
                conquistado nao cai no mes seguinte.
              </span>
            </li>
          </ul>

          <div className="referral-hero-link">
            <span className="muted">Seu link de indicacao</span>
            <strong>{memberSignupLink}</strong>
          </div>

          <AffiliateLinkButton href={memberSignupLink} />
        </div>

        <aside className="referral-hero-score">
          <div>
            <span>Creditos de {janela} dias</span>
            <strong>{data.stats.freeAccessCredits}</strong>
          </div>
          <div>
            <span>Membros na sua rede</span>
            <strong>{data.stats.directMembers}</strong>
          </div>
          <div className="referral-hero-progress">
            <span>Progresso do nivel</span>
            <div className="course-bar" role="img" aria-label={`${nivel.percent}% do proximo nivel`}>
              <span style={{ width: `${nivel.percent}%` }} />
            </div>
          </div>
        </aside>
      </section>

      <section className="kpi-grid">
        <PortalKpi icon={Link2} label="Cliques" value={String(data.stats.totalClicks)} detail="Acessos no seu link" tone="blue" />
        <PortalKpi icon={Users} label="Vendas pagas" value={String(data.stats.paidSales)} detail={formatCurrency(data.stats.grossSalesCents)} />
        <PortalKpi icon={CalendarClock} label="Em carencia" value={String(data.stats.holdSales)} detail={`${data.settings.hold_days} dias de validacao`} tone="amber" />
        <PortalKpi icon={HandCoins} label="Disponivel" value={formatCurrency(data.stats.availableCents)} detail={`Minimo ${formatCurrency(data.settings.min_withdrawal_cents)}`} tone="green" />
        <PortalKpi icon={Users} label="Minha rede" value={String(data.stats.directMembers)} detail={`${data.settings.network_bonus_percent}% sobre vendas liberadas`} tone="blue" />
        <PortalKpi icon={Trophy} label="Bonus de rede" value={formatCurrency(data.stats.networkBonusCents)} detail={`${data.stats.networkEligibleSales} vendas nivel 2`} tone="green" />
      </section>

      {params.cadastro ? <div className="success-banner">Cadastro criado. Sua dashboard ja esta ativa.</div> : null}
      {params.pix ? <div className="success-banner">Chave PIX salva para os proximos saques.</div> : null}
      {params.wallets ? <div className="success-banner">Carteiras descentralizadas salvas.</div> : null}
      {params.saque ? <div className="success-banner">Saque solicitado. O admin vai revisar e marcar como pago.</div> : null}

      <section className="affiliate-grid">
        <div className="primary-column">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Minhas indicacoes</h2>
                <p>Somente vendas liberadas entram no saldo disponivel para saque.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Assinatura</th>
                    <th>Pagamento</th>
                    <th>Liberacao</th>
                    <th>Status</th>
                    <th>Comissao</th>
                  </tr>
                </thead>
                <tbody>
                  {data.referrals.map((referral) => {
                    const status = statusLabel(referral, data.settings.hold_days);
                    return (
                      <tr key={referral.id}>
                        <td>
                          <strong>{referral.customer_name}</strong>
                          <span>{referral.customer_email}</span>
                        </td>
                        <td>{formatCurrency(referral.subscription_value_cents)}</td>
                        <td>{dateLabel(referral.paid_at)}</td>
                        <td>{dateLabel(getHoldDeadline(referral.paid_at, data.settings.hold_days))}</td>
                        <td>
                          <span className={`badge ${status.className}`}>{status.label}</span>
                        </td>
                        <td>{formatCurrency(referral.commission_cents)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Meus saques</h2>
                <p>Historico das solicitacoes abertas pelo portal ou pelo admin.</p>
              </div>
            </div>
            <div className="table-wrap compact">
              <table>
                <thead>
                  <tr>
                    <th>Valor</th>
                    <th>Chave</th>
                    <th>Solicitado</th>
                    <th>Status</th>
                    <th>Pago em</th>
                  </tr>
                </thead>
                <tbody>
                  {data.withdrawals.length ? (
                    data.withdrawals.map((withdrawal) => (
                      <tr key={withdrawal.id}>
                        <td>{formatCurrency(withdrawal.amount_cents)}</td>
                        <td>{withdrawal.pix_key}</td>
                        <td>{dateLabel(withdrawal.requested_at)}</td>
                        <td>
                          <span className={withdrawal.status === "paid" ? "badge success" : "badge warning"}>
                            {withdrawal.status === "paid" ? "Pago" : "Solicitado"}
                          </span>
                        </td>
                        <td>{dateLabel(withdrawal.paid_at)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="empty-row">Nenhum saque solicitado ainda.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Minha rede direta</h2>
                <p>Membros cadastrados pelo seu link. O bonus aparece quando eles geram vendas liberadas.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Membro</th>
                    <th>Codigo</th>
                    <th>Pagas</th>
                    <th>Liberadas</th>
                    <th>Bonus gerado</th>
                  </tr>
                </thead>
                <tbody>
                  {data.networkMembers.length ? (
                    data.networkMembers.map((member) => (
                      <tr key={member.id}>
                        <td>
                          <strong>{member.name}</strong>
                          <span>{member.email}</span>
                        </td>
                        <td>{member.code}</td>
                        <td>{member.paid_referrals}</td>
                        <td>{member.eligible_referrals}</td>
                        <td>{formatCurrency(member.network_bonus_cents)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="empty-row">Nenhum membro direto cadastrado ainda.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="side-column">
          <section className="panel form-panel">
            <div className="panel-header">
              <h2>Chave PIX</h2>
              <HandCoins size={18} />
            </div>
            <form action={affiliateUpdatePixKeyAction} className="stack">
              <label>
                Chave para recebimento
                <input
                  name="pix_key"
                  defaultValue={data.affiliate.pix_key ?? ""}
                  placeholder="CPF, e-mail, telefone ou chave aleatoria"
                  required
                />
              </label>
              <button className="primary-button" type="submit">
                Salvar chave PIX
              </button>
              <p className="form-help">Essa chave sera usada quando voce solicitar saque das comissoes liberadas.</p>
            </form>
          </section>

          <section className="panel form-panel">
            <div className="panel-header">
              <h2>Carteiras</h2>
              <WalletCards size={18} />
            </div>
            <form action={affiliateUpdateWalletsAction} className="stack">
              <label>
                Bitcoin
                <input name="wallet_bitcoin" defaultValue={walletAddress("Bitcoin")} placeholder="bc1..." />
              </label>
              <label>
                BNB Chain
                <input name="wallet_bnb" defaultValue={walletAddress("BNB Chain")} placeholder="0x..." />
              </label>
              <label>
                TRON
                <input name="wallet_tron" defaultValue={walletAddress("TRON")} placeholder="T..." />
              </label>
              <label>
                Polygon
                <input name="wallet_polygon" defaultValue={walletAddress("Polygon")} placeholder="0x..." />
              </label>
              <button className="primary-button" type="submit">
                Salvar carteiras
              </button>
              <p className="form-help">Use esses enderecos para receber bonus em carteira descentralizada.</p>
            </form>
          </section>

          <section className="panel form-panel">
            <div className="panel-header">
              <h2>Solicitar saque</h2>
              <HandCoins size={18} />
            </div>
            <form action={affiliateRequestWithdrawalAction} className="stack">
              <label>
                Valor
                <input name="amount" defaultValue={centsInput(Math.max(data.stats.availableCents, data.settings.min_withdrawal_cents))} required />
              </label>
              <label>
                Chave PIX ou carteira
                <input
                  name="pix_key"
                  defaultValue={data.affiliate.pix_key ?? ""}
                  placeholder="CPF, e-mail, telefone, aleatoria ou wallet"
                  required
                />
              </label>
              <button className="primary-button" type="submit" disabled={data.stats.availableCents < data.settings.min_withdrawal_cents}>
                Solicitar saque
              </button>
              <p className="form-help">
                Disponivel: {formatCurrency(data.stats.availableCents)}. Minimo: {formatCurrency(data.settings.min_withdrawal_cents)}.
              </p>
            </form>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Meta de acesso gratis</h2>
                <p>{data.settings.free_access_sales_target} vendas liberadas a cada {data.settings.free_access_window_days} dias.</p>
              </div>
              <Trophy size={18} />
            </div>
            <div className="portal-goal">
              <strong>{data.stats.freeAccessCredits}</strong>
              <span>creditos de 30 dias disponiveis</span>
            </div>
          </section>
        </aside>
      </section>
    </main>
  );
}
