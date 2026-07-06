import Link from "next/link";
import { getPaymentOrderByOrderNsu } from "@/lib/db";
import { formatCurrency } from "@/lib/money";

export default async function InfinitePayReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ order_nsu?: string }>;
}) {
  const params = await searchParams;
  const orderNsu = params.order_nsu ?? "";
  const order = orderNsu ? getPaymentOrderByOrderNsu(orderNsu) : null;
  const paid = order?.status === "paid";

  return (
    <main className="login-page">
      <section className="login-panel payment-return-panel">
        <div>
          <p className="eyebrow">Premium Member</p>
          <h1>{paid ? "Pagamento confirmado" : "Pagamento em verificacao"}</h1>
          <p className="muted">
            {paid
              ? "Recebemos a confirmacao da InfinitePay. A indicacao ja entrou na carencia operacional."
              : "Se o pagamento foi concluido, a confirmacao automatica pode levar alguns instantes."}
          </p>
        </div>

        {order ? (
          <div className="payment-summary">
            <span>Pedido</span>
            <strong>{order.order_nsu}</strong>
            <span>Valor</span>
            <strong>{formatCurrency(order.amount_cents)}</strong>
            <span>Status</span>
            <strong>{paid ? "Pago" : "Aguardando confirmacao"}</strong>
          </div>
        ) : (
          <p className="form-error">Pedido nao encontrado.</p>
        )}

        <Link className="primary-button" href="/socio/login">
          Acessar portal
        </Link>
      </section>
    </main>
  );
}
