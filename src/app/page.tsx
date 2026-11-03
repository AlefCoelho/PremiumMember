import {
  AlertTriangle,
  BadgeDollarSign,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Crown,
  HandCoins,
  LayoutDashboard,
  Link2,
  LogOut,
  MessagesSquare,
  Plug,
  Plus,
  Settings2,
  ShieldCheck,
  Users,
  WalletCards,
} from "lucide-react";
import {
  blockReferralAction,
  createAffiliateAction,
  createDigitalWalletAction,
  createPaymentIntegrationAction,
  createReferralAction,
  logoutAction,
  markReferralPaidAction,
  payWithdrawalAction,
  requestWithdrawalAction,
  saveStrategyFlowAction,
  updateProgramSettingsAction,
} from "@/app/actions";
import Link from "next/link";
import { AffiliateLinkButton } from "@/components/AffiliateLinkButton";
import { StrategyFlowBuilder } from "@/components/StrategyFlowBuilder";
import { requireAdmin } from "@/lib/auth";
import {
  getDashboardData,
  getAffiliateBaseUrl,
  type AffiliateSummary,
  type DigitalWalletRow,
  type PaymentIntegrationRow,
  type PaymentOrderRow,
  type ReferralRow,
  type WithdrawalRow,
} from "@/lib/db";
import { formatCurrency } from "@/lib/money";
import { getHoldDeadline, getReferralStatus } from "@/lib/rules";

const navItems = [
  { label: "Visao geral", icon: LayoutDashboard },
  { label: "Construtor", icon: Settings2 },
  { label: "Membros", icon: Users },
  { label: "Indicacoes", icon: Link2 },
  { label: "Pagamentos", icon: CircleDollarSign },
  { label: "Saques", icon: HandCoins },
  { label: "Regras", icon: ShieldCheck },
  { label: "Integracoes", icon: Plug },
  { label: "Carteiras", icon: WalletCards },
];

function dateLabel(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(
    new Date(`${value}T00:00:00`)
  );
}

function centsInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function referralStatus(referral: ReferralRow, holdDays: number) {
  const status = getReferralStatus({ ...referral, holdDays });
  if (status === "eligible") return { className: "success", label: "Liberada" };
  if (status === "paid") return { className: "warning", label: "Carencia" };
  if (status === "blocked") return { className: "danger", label: "Bloqueada" };
  return { className: "neutral", label: "Aguardando" };
}

function KpiCard({
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
  tone?: "default" | "green" | "amber" | "blue";
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

function AffiliateRow({ affiliate, affiliateBaseUrl }: { affiliate: AffiliateSummary; affiliateBaseUrl: string }) {
  const copyShieldLink = `${affiliateBaseUrl}/r/${encodeURIComponent(affiliate.code)}/copyshieldpro`;
  const tradeShieldLink = `${affiliateBaseUrl}/r/${encodeURIComponent(affiliate.code)}/tradeshield`;
  const memberSignupLink = `${affiliateBaseUrl}/cadastro-membro?sponsor=${encodeURIComponent(affiliate.code)}`;

  return (
    <tr>
      <td>
        <strong>{affiliate.name}</strong>
        <span>{affiliate.email}</span>
        <span>{affiliate.pix_key ? `PIX: ${affiliate.pix_key}` : "PIX nao informado"}</span>
      </td>
      <td>{affiliate.code}</td>
      <td>
        <strong>{affiliate.sponsor_name ?? "-"}</strong>
        <span>{affiliate.direct_member_count} membros diretos</span>
      </td>
      <td>
        <AffiliateLinkButton href={copyShieldLink} />
        <span className="affiliate-url">CopyShield: {copyShieldLink}</span>
        <span className="affiliate-url">TradeShield: {tradeShieldLink}</span>
        <span className="affiliate-url">{memberSignupLink}</span>
      </td>
      <td>
        <strong>{affiliate.click_count}</strong>
        <span>{affiliate.last_click_at ? "Ultimo clique registrado" : "Sem cliques"}</span>
      </td>
      <td>{affiliate.total_referrals}</td>
      <td>{affiliate.hold_referrals}</td>
      <td>{affiliate.paid_referrals}</td>
      <td>{affiliate.eligible_referrals}</td>
      <td>
        <strong>{formatCurrency(affiliate.eligible_sales_cents)}</strong>
        <span>Em prazo {formatCurrency(affiliate.hold_sales_cents)}</span>
      </td>
      <td>{formatCurrency(affiliate.network_bonus_cents)}</td>
      <td>{formatCurrency(affiliate.available_cents)}</td>
      <td>
        <span className={affiliate.free_access_credits > 0 ? "badge success" : "badge neutral"}>
          {affiliate.free_access_credits > 0 ? `${affiliate.free_access_credits} credito` : "Sem credito"}
        </span>
      </td>
    </tr>
  );
}

function MemberLeadBank({
  affiliates,
  referrals,
  holdDays,
}: {
  affiliates: AffiliateSummary[];
  referrals: ReferralRow[];
  holdDays: number;
}) {
  return (
    <div className="lead-bank-list">
      {affiliates.map((affiliate) => {
        const memberReferrals = referrals.filter((referral) => referral.affiliate_id === affiliate.id);

        return (
          <details className="lead-bank-member" key={affiliate.id}>
            <summary>
              <div>
                <strong>{affiliate.name}</strong>
                <span>{affiliate.email}</span>
              </div>
              <div>
                <strong>{affiliate.total_referrals}</strong>
                <span>leads</span>
              </div>
              <div>
                <strong>{affiliate.hold_referrals}</strong>
                <span>em prazo</span>
              </div>
              <div>
                <strong>{affiliate.eligible_referrals}</strong>
                <span>liberadas</span>
              </div>
              <div>
                <strong>{formatCurrency(affiliate.eligible_sales_cents)}</strong>
                <span>aprovado 7d</span>
              </div>
              <div>
                <strong>{formatCurrency(affiliate.hold_sales_cents)}</strong>
                <span>aguardando</span>
              </div>
            </summary>
            <div className="table-wrap compact">
              <table>
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Contato</th>
                    <th>Assinatura</th>
                    <th>Pagamento</th>
                    <th>Liberacao</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {memberReferrals.length ? (
                    memberReferrals.map((referral) => {
                      const status = referralStatus(referral, holdDays);
                      return (
                        <tr key={referral.id}>
                          <td>
                            <strong>{referral.customer_name}</strong>
                            <span>Indicado em {dateLabel(referral.indicated_at)}</span>
                          </td>
                          <td>
                            <strong>{referral.customer_email}</strong>
                            <span>{referral.customer_phone || "WhatsApp nao informado"}</span>
                          </td>
                          <td>{formatCurrency(referral.subscription_value_cents)}</td>
                          <td>{dateLabel(referral.paid_at)}</td>
                          <td>{dateLabel(getHoldDeadline(referral.paid_at, holdDays))}</td>
                          <td>
                            <span className={`badge ${status.className}`}>{status.label}</span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="empty-row">
                        Nenhum lead registrado para este membro.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </details>
        );
      })}
    </div>
  );
}

function ReferralRowItem({ referral, holdDays }: { referral: ReferralRow; holdDays: number }) {
  const status = referralStatus(referral, holdDays);

  return (
    <tr>
      <td>
        <strong>{referral.affiliate_name}</strong>
        <span>#{referral.affiliate_id}</span>
      </td>
      <td>
        <strong>{referral.customer_name}</strong>
        <span>{referral.customer_email}</span>
        <span>{referral.customer_phone || "WhatsApp nao informado"}</span>
      </td>
      <td>{formatCurrency(referral.subscription_value_cents)}</td>
      <td>{dateLabel(referral.paid_at)}</td>
      <td>{dateLabel(getHoldDeadline(referral.paid_at, holdDays))}</td>
      <td>
        <span className={`badge ${status.className}`}>{status.label}</span>
      </td>
      <td className="row-actions">
        {!referral.paid_at ? (
          <form action={markReferralPaidAction}>
            <input type="hidden" name="id" value={referral.id} />
            <button type="submit" className="icon-button text-button">
              Pago
            </button>
          </form>
        ) : null}
        {!referral.refunded_at && !referral.cancelled_at ? (
          <form action={blockReferralAction}>
            <input type="hidden" name="id" value={referral.id} />
            <input type="hidden" name="reason" value="refund" />
            <button type="submit" className="icon-button danger-button">
              Reembolso
            </button>
          </form>
        ) : null}
      </td>
    </tr>
  );
}

function WithdrawalRowItem({ withdrawal }: { withdrawal: WithdrawalRow }) {
  return (
    <tr>
      <td>
        <strong>{withdrawal.affiliate_name}</strong>
        <span>{withdrawal.pix_key}</span>
      </td>
      <td>{formatCurrency(withdrawal.amount_cents)}</td>
      <td>{dateLabel(withdrawal.requested_at)}</td>
      <td>
        <span className={withdrawal.status === "paid" ? "badge success" : "badge warning"}>
          {withdrawal.status === "paid" ? "Pago" : "Solicitado"}
        </span>
      </td>
      <td>
        {withdrawal.status !== "paid" ? (
          <form action={payWithdrawalAction}>
            <input type="hidden" name="id" value={withdrawal.id} />
            <button type="submit" className="icon-button text-button">
              Marcar pago
            </button>
          </form>
        ) : (
          dateLabel(withdrawal.paid_at)
        )}
      </td>
    </tr>
  );
}

function PaymentIntegrationItem({ integration }: { integration: PaymentIntegrationRow }) {
  return (
    <tr>
      <td>
        <strong>{integration.name}</strong>
        <span>{integration.provider}</span>
      </td>
      <td>{integration.settlement_currency}</td>
      <td>
        <span className={integration.status === "active" ? "badge success" : "badge warning"}>
          {integration.status === "active" ? "Ativa" : "Rascunho"}
        </span>
      </td>
      <td>
        <strong>{integration.checkout_url ? "Checkout pronto" : "Sem checkout"}</strong>
        <span>{integration.webhook_url ? "Webhook configurado" : "Webhook pendente"}</span>
      </td>
    </tr>
  );
}

function PaymentOrderItem({ order }: { order: PaymentOrderRow }) {
  return (
    <tr>
      <td>
        <strong>{order.customer_name}</strong>
        <span>{order.customer_email}</span>
      </td>
      <td>
        <strong>{order.order_nsu}</strong>
        <span>{order.provider}</span>
      </td>
      <td>{formatCurrency(order.amount_cents)}</td>
      <td>
        <span className={order.status === "paid" ? "badge success" : "badge warning"}>
          {order.status === "paid" ? "Pago" : "Pendente"}
        </span>
      </td>
      <td>{order.paid_at ? dateLabel(order.paid_at) : dateLabel(order.created_at.slice(0, 10))}</td>
    </tr>
  );
}

function DigitalWalletItem({ wallet }: { wallet: DigitalWalletRow }) {
  return (
    <tr>
      <td>
        <strong>{wallet.label}</strong>
        <span>{wallet.owner_type === "affiliate" ? wallet.affiliate_name ?? "Membro" : "Carteira da plataforma"}</span>
      </td>
      <td>{wallet.network}</td>
      <td>{wallet.asset_symbol}</td>
      <td>
        <span className="mono-value">{wallet.address}</span>
      </td>
      <td>
        <span className={wallet.status === "active" ? "badge success" : "badge neutral"}>
          {wallet.status === "active" ? "Ativa" : "Inativa"}
        </span>
      </td>
    </tr>
  );
}

export default async function Home() {
  await requireAdmin();
  const { affiliates, referrals, withdrawals, paymentIntegrations, paymentOrders, digitalWallets, strategyFlow, settings, stats, today } =
    getDashboardData();
  const affiliateBaseUrl = getAffiliateBaseUrl();

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">PM</div>
          <div>
            <strong>Premium Member</strong>
            <span>Membros afiliados</span>
          </div>
        </div>

        <nav>
          {navItems.map((item, index) => (
            <a className={index === 0 ? "active" : ""} href={`#${item.label.toLowerCase().replace(/\s+/g, "-")}`} key={item.label}>
              <item.icon size={18} />
              {item.label}
            </a>
          ))}
          <Link href="/admin/comunidade">
            <MessagesSquare size={18} />
            Comunidade
          </Link>
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
            <h1>Painel de membros afiliados</h1>
            <p>
              Estrategia ativa: {settings.strategy_name}. {settings.free_access_sales_target} vendas pagas + carencia de{" "}
              {settings.hold_days} dias para liberar comissao e mes gratis.
            </p>
          </div>
          <div className="date-chip">
            <CalendarClock size={18} />
            Hoje: {dateLabel(today)}
          </div>
        </header>

        <section className="kpi-grid" id="visao-geral">
          <KpiCard
            icon={BadgeDollarSign}
            label="Vendas confirmadas"
            value={String(stats.confirmedSales)}
            detail={`${formatCurrency(stats.grossSalesCents)} em assinaturas`}
            tone="blue"
          />
          <KpiCard
            icon={CalendarClock}
            label="Em carencia"
            value={String(stats.holdSales)}
            detail={`${settings.hold_days} dias antes da liberacao`}
            tone="amber"
          />
          <KpiCard
            icon={HandCoins}
            label="Comissao liberada"
            value={formatCurrency(stats.availableCommissionCents)}
            detail={`Saque minimo ${formatCurrency(settings.min_withdrawal_cents)}`}
            tone="green"
          />
          <KpiCard
            icon={Crown}
            label="Assinaturas gratis"
            value={String(stats.freeAccessCredits)}
            detail={stats.accessRuleLabel}
          />
          <KpiCard
            icon={Users}
            label="Bonus de rede"
            value={formatCurrency(stats.networkBonusCents)}
            detail={`${settings.network_bonus_percent}% sobre vendas liberadas do nivel 2`}
            tone="green"
          />
          <KpiCard
            icon={WalletCards}
            label="Tesouraria on-chain"
            value={String(stats.activePlatformWallets)}
            detail="Carteiras oficiais da plataforma"
            tone="blue"
          />
        </section>

        <StrategyFlowBuilder
          initialName={strategyFlow.name}
          initialNodesJson={strategyFlow.nodes_json}
          initialEdgesJson={strategyFlow.edges_json}
          saveAction={saveStrategyFlowAction}
        />

        <section className="main-grid">
          <div className="primary-column">
            <section className="panel" id="indicacoes">
              <div className="panel-header">
                <div>
                  <h2>Funil de indicacoes</h2>
                  <p>Controle o que ainda nao pagou, o que esta em carencia e o que ja pode gerar comissao.</p>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Membro</th>
                      <th>Cliente indicado</th>
                      <th>Assinatura</th>
                      <th>Pagamento</th>
                      <th>Liberacao</th>
                      <th>Status</th>
                      <th>Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((referral) => (
                      <ReferralRowItem referral={referral} holdDays={settings.hold_days} key={referral.id} />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel" id="membros">
              <div className="panel-header">
                <div>
                  <h2>Membros cadastrados</h2>
                  <p>Resumo financeiro por afiliado, incluindo comissao disponivel e creditos de acesso.</p>
                </div>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Membro</th>
                      <th>Codigo</th>
                      <th>Patrocinador</th>
                      <th>Link exclusivo</th>
                      <th>Cliques</th>
                      <th>Leads</th>
                      <th>Em prazo</th>
                      <th>Pagas</th>
                      <th>Liberadas</th>
                      <th>Assinaturas</th>
                      <th>Rede</th>
                      <th>Disponivel</th>
                      <th>Acesso gratis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {affiliates.map((affiliate) => (
                      <AffiliateRow affiliate={affiliate} affiliateBaseUrl={affiliateBaseUrl} key={affiliate.id} />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel" id="banco-leads">
              <div className="panel-header">
                <div>
                  <h2>Banco de leads por membro</h2>
                  <p>Contato dos leads indicados, valor de assinatura, prazo de 7 dias e status de liberacao.</p>
                </div>
              </div>
              <MemberLeadBank affiliates={affiliates} referrals={referrals} holdDays={settings.hold_days} />
            </section>

            <section className="panel" id="saques">
              <div className="panel-header">
                <div>
                  <h2>Saques</h2>
                  <p>Solicitacoes so devem ser abertas quando houver saldo realmente liberado.</p>
                </div>
              </div>
              <div className="table-wrap compact">
                <table>
                  <thead>
                    <tr>
                      <th>Membro</th>
                      <th>Valor</th>
                      <th>Solicitado</th>
                      <th>Status</th>
                      <th>Pagamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.length ? (
                      withdrawals.map((withdrawal) => <WithdrawalRowItem withdrawal={withdrawal} key={withdrawal.id} />)
                    ) : (
                      <tr>
                        <td colSpan={5} className="empty-row">
                          Nenhum saque solicitado ainda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel rules-editor" id="regras">
              <div className="panel-header">
                <div>
                  <h2>Regras e estrategia</h2>
                  <p>Mude preco, comissao, links, carencia, mes gratis e politicas sem editar codigo.</p>
                </div>
                <Settings2 size={18} />
              </div>
              <form action={updateProgramSettingsAction} className="stack">
                <label>
                  Nome da estrategia
                  <input name="strategy_name" defaultValue={settings.strategy_name} required />
                </label>
                <div className="split-fields">
                  <label>
                    Assinatura
                    <input name="subscription_value" defaultValue={centsInput(settings.subscription_value_cents)} />
                  </label>
                  <label>
                    Comissao por venda
                    <input name="commission" defaultValue={centsInput(settings.commission_per_sale_cents)} />
                  </label>
                </div>
                <div className="split-fields">
                  <label>
                    Carencia em dias
                    <input name="hold_days" type="number" min="1" defaultValue={settings.hold_days} />
                  </label>
                  <label>
                    Minimo para saque
                    <input name="min_withdrawal" defaultValue={centsInput(settings.min_withdrawal_cents)} />
                  </label>
                </div>
                <div className="split-fields">
                  <label>
                    Vendas para mes gratis
                    <input name="free_access_sales_target" type="number" min="1" defaultValue={settings.free_access_sales_target} />
                  </label>
                  <label>
                    Janela em dias
                    <input name="free_access_window_days" type="number" min="1" defaultValue={settings.free_access_window_days} />
                  </label>
                </div>
                <label>
                  Bonus de rede em %
                  <input name="network_bonus_percent" type="number" min="0" max="100" defaultValue={settings.network_bonus_percent} />
                </label>
                <label className="checkbox-row">
                  <input name="allow_digital_wallets" type="checkbox" defaultChecked={settings.allow_digital_wallets === 1} />
                  Permitir saques por carteiras digitais
                </label>
                <div className="settings-group">
                  <div>
                    <strong>Dominios e links</strong>
                    <span>Controla o link exclusivo exibido para membros e o destino do cadastro.</span>
                  </div>
                  <label>
                    Dominio publico dos links
                    <input name="affiliate_public_base_url" defaultValue={settings.affiliate_public_base_url} required />
                  </label>
                  <label>
                    Cadastro CopyShield Pro
                    <input name="signup_target_url" defaultValue={settings.signup_target_url} required />
                  </label>
                  <label>
                    Cadastro TradeShield
                    <input name="tradeshield_signup_url" defaultValue={settings.tradeshield_signup_url} required />
                  </label>
                </div>
                <label>
                  Politica anti-fraude
                  <textarea name="fraud_policy" rows={3} defaultValue={settings.fraud_policy} />
                </label>
                <label>
                  Politica de saque
                  <textarea name="payout_policy" rows={3} defaultValue={settings.payout_policy} />
                </label>
                <button type="submit" className="primary-button">
                  Salvar regras
                </button>
              </form>
            </section>

            <section className="panel" id="integracoes">
              <div className="panel-header">
                <div>
                  <h2>Plataformas de pagamento</h2>
                  <p>Cadastre qualquer checkout ou gateway usando URL, webhook e referencias de credenciais.</p>
                </div>
                <Plug size={18} />
              </div>
              <div className="table-wrap compact">
                <table>
                  <thead>
                    <tr>
                      <th>Integracao</th>
                      <th>Moeda</th>
                      <th>Status</th>
                      <th>Conexao</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentIntegrations.length ? (
                      paymentIntegrations.map((integration) => (
                        <PaymentIntegrationItem integration={integration} key={integration.id} />
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="empty-row">
                          Nenhuma plataforma conectada ainda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel" id="pagamentos">
              <div className="panel-header">
                <div>
                  <h2>Pedidos InfinitePay</h2>
                  <p>Checkouts criados pelo Premium Member e confirmacoes recebidas por retorno ou webhook.</p>
                </div>
                <CircleDollarSign size={18} />
              </div>
              <div className="table-wrap compact">
                <table>
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Pedido</th>
                      <th>Valor</th>
                      <th>Status</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentOrders.length ? (
                      paymentOrders.map((order) => <PaymentOrderItem order={order} key={order.id} />)
                    ) : (
                      <tr>
                        <td colSpan={5} className="empty-row">
                          Nenhum pedido InfinitePay criado ainda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel" id="carteiras">
              <div className="panel-header">
                <div>
                  <h2>Tesouraria e carteiras digitais</h2>
                  <p>Enderecos publicos da plataforma e carteiras dos membros para recebimentos e saques on-chain.</p>
                </div>
                <WalletCards size={18} />
              </div>
              <div className="table-wrap compact">
                <table>
                  <thead>
                    <tr>
                      <th>Carteira</th>
                      <th>Rede</th>
                      <th>Ativo</th>
                      <th>Endereco</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {digitalWallets.length ? (
                      digitalWallets.map((wallet) => <DigitalWalletItem wallet={wallet} key={wallet.id} />)
                    ) : (
                      <tr>
                        <td colSpan={5} className="empty-row">
                          Nenhuma carteira cadastrada ainda.
                        </td>
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
                <h2>Novo membro</h2>
                <Plus size={18} />
              </div>
              <form action={createAffiliateAction} className="stack">
                <label>
                  Nome
                  <input name="name" placeholder="Nome do membro" required />
                </label>
                <label>
                  E-mail
                  <input name="email" type="email" placeholder="email@dominio.com" required />
                </label>
                <label>
                  WhatsApp
                  <input name="phone" placeholder="+55..." />
                </label>
                <label>
                  Chave PIX
                  <input name="pix_key" placeholder="CPF, e-mail, telefone ou chave aleatoria" />
                </label>
                <label>
                  Codigo
                  <input name="code" placeholder="MEMBRO10" required />
                </label>
                <label>
                  Senha inicial
                  <input name="password" type="password" minLength={6} placeholder="Opcional" />
                </label>
                <label>
                  Patrocinador
                  <select name="sponsor_id" defaultValue="">
                    <option value="">Sem patrocinador</option>
                    {affiliates.map((affiliate) => (
                      <option value={affiliate.id} key={affiliate.id}>
                        {affiliate.name} - {affiliate.code}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Observacoes
                  <textarea name="notes" rows={3} placeholder="Origem, acordo ou restricao operacional" />
                </label>
                <button type="submit" className="primary-button">
                  Cadastrar membro
                </button>
              </form>
            </section>

            <section className="panel form-panel">
              <div className="panel-header">
                <h2>Nova indicacao</h2>
                <Plus size={18} />
              </div>
              <form action={createReferralAction} className="stack">
                <label>
                  Membro responsavel
                  <select name="affiliate_id" required>
                    {affiliates.map((affiliate) => (
                      <option value={affiliate.id} key={affiliate.id}>
                        {affiliate.name} - {affiliate.code}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Cliente
                  <input name="customer_name" placeholder="Nome do cliente" required />
                </label>
                <label>
                  E-mail do cliente
                  <input name="customer_email" type="email" placeholder="cliente@email.com" required />
                </label>
                <label>
                  WhatsApp do lead
                  <input name="customer_phone" placeholder="+55..." />
                </label>
                <div className="split-fields">
                  <label>
                    Assinatura
                    <input name="subscription_value" defaultValue={centsInput(settings.subscription_value_cents)} />
                  </label>
                  <label>
                    Comissao
                    <input name="commission" defaultValue={centsInput(settings.commission_per_sale_cents)} />
                  </label>
                </div>
                <div className="split-fields">
                  <label>
                    Indicacao
                    <input name="indicated_at" type="date" defaultValue={today} />
                  </label>
                  <label>
                    Pagamento
                    <input name="paid_at" type="date" />
                  </label>
                </div>
                <button type="submit" className="primary-button">
                  Registrar indicacao
                </button>
              </form>
            </section>

            <section className="panel form-panel">
              <div className="panel-header">
                <h2>Novo saque</h2>
                <HandCoins size={18} />
              </div>
              <form action={requestWithdrawalAction} className="stack">
                <label>
                  Membro
                  <select name="affiliate_id" required>
                    {affiliates.map((affiliate) => (
                      <option value={affiliate.id} key={affiliate.id}>
                        {affiliate.name} - disponivel {formatCurrency(affiliate.available_cents)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Valor
                  <input name="amount" placeholder={centsInput(settings.min_withdrawal_cents)} required />
                </label>
                <label>
                  Chave PIX ou carteira
                  <input name="pix_key" placeholder="CPF, e-mail, telefone, aleatoria ou wallet" required />
                </label>
                <button type="submit" className="primary-button">
                  Solicitar saque
                </button>
              </form>
            </section>

            <section className="panel form-panel">
              <div className="panel-header">
                <h2>Nova integracao</h2>
                <Plug size={18} />
              </div>
              <form action={createPaymentIntegrationAction} className="stack">
                <label>
                  Nome interno
                  <input name="name" placeholder="InfinitePay, Stripe, Mercado Pago..." required />
                </label>
                <label>
                  Provedor
                  <input name="provider" placeholder="infinitepay | stripe | custom" required />
                </label>
                <label>
                  URL do checkout
                  <input name="checkout_url" placeholder="https://..." />
                </label>
                <label>
                  URL do webhook
                  <input name="webhook_url" placeholder="https://seuapp.com/api/webhooks/..." />
                </label>
                <div className="split-fields">
                  <label>
                    Moeda
                    <input name="settlement_currency" defaultValue="BRL" />
                  </label>
                  <label>
                    Status
                    <select name="status" defaultValue="draft">
                      <option value="draft">Rascunho</option>
                      <option value="active">Ativa</option>
                    </select>
                  </label>
                </div>
                <label>
                  Ref. chave publica
                  <input name="public_key_ref" placeholder="PAYMENT_PUBLIC_KEY" />
                </label>
                <label>
                  Ref. segredo/webhook
                  <input name="secret_ref" placeholder="PAYMENT_SECRET_KEY" />
                </label>
                <button type="submit" className="primary-button">
                  Adicionar plataforma
                </button>
              </form>
            </section>

            <section className="panel form-panel">
              <div className="panel-header">
                <h2>Nova carteira</h2>
                <WalletCards size={18} />
              </div>
              <form action={createDigitalWalletAction} className="stack">
                <label>
                  Dono
                  <select name="owner_type" defaultValue="platform">
                    <option value="platform">Plataforma</option>
                    <option value="affiliate">Membro afiliado</option>
                  </select>
                </label>
                <label>
                  Membro vinculado
                  <select name="affiliate_id">
                    <option value="">Sem membro</option>
                    {affiliates.map((affiliate) => (
                      <option value={affiliate.id} key={affiliate.id}>
                        {affiliate.name} - {affiliate.code}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Nome da carteira
                  <input name="label" placeholder="Tesouraria Polygon / Marcos USDC" required />
                </label>
                <div className="split-fields">
                  <label>
                    Rede
                    <input name="network" placeholder="Polygon, Ethereum, BSC" required />
                  </label>
                  <label>
                    Ativo
                    <input name="asset_symbol" placeholder="USDT" required />
                  </label>
                </div>
                <label>
                  Endereco
                  <input name="address" placeholder="0x..." required />
                </label>
                <div className="split-fields">
                  <label>
                    Saque
                    <select name="payout_mode" defaultValue="manual">
                      <option value="manual">Manual</option>
                      <option value="review">Com revisao</option>
                      <option value="auto">Automatico</option>
                    </select>
                  </label>
                  <label>
                    Status
                    <select name="status" defaultValue="active">
                      <option value="active">Ativa</option>
                      <option value="inactive">Inativa</option>
                    </select>
                  </label>
                </div>
                <button type="submit" className="primary-button">
                  Cadastrar carteira
                </button>
              </form>
            </section>

            <section className="panel risk-panel">
              <div className="panel-header">
                <h2>Falhas estrategicas</h2>
                <AlertTriangle size={18} />
              </div>
              <ul className="risk-list">
                <li>
                  <strong>Risco de reembolso apos premio.</strong>
                  <span>Mantenha saque e acesso gratis bloqueados ate completar a carencia sem cancelamento.</span>
                </li>
                <li>
                  <strong>Risco de tres vendas falsas.</strong>
                  <span>Exija cliente unico por e-mail/CPF e bloqueie autoindicacao.</span>
                </li>
                <li>
                  <strong>Risco em cripto.</strong>
                  <span>Use carteira aprovada, revisao manual e comprovante antes de marcar saque como pago.</span>
                </li>
                <li>
                  <strong>Risco de gateway generico.</strong>
                  <span>Integre webhook assinado antes de considerar uma plataforma como ativa.</span>
                </li>
              </ul>
              <div className="rule-box">
                <CheckCircle2 size={18} />
                <p>
                  Regra atual: venda entra como <b>em carencia</b>, vira <b>liberada</b> apos {settings.hold_days} dias
                  e so entao soma para saque e acesso gratis.
                </p>
              </div>
            </section>
          </aside>
        </section>
      </section>
    </main>
  );
}
