import { NextRequest, NextResponse } from "next/server";
import { validateInternalApiSecret } from "@/lib/api-security";
import {
  createPaymentOrder,
  getAffiliateByCode,
  getAffiliateById,
  getAffiliateBaseUrl,
  getProgramSettings,
} from "@/lib/db";
import {
  buildInfinitePayCheckoutUrl,
  buildOrderNsu,
  getInfinitePayHandle,
  INFINITEPAY_PROVIDER,
} from "@/lib/infinitepay";

type CheckoutPayload = {
  affiliate_code?: string;
  affiliate_id?: number | string;
  click_uid?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  amount_cents?: number;
  commission_cents?: number;
  item_name?: string;
};

export async function POST(request: NextRequest) {
  if (!validateInternalApiSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const handle = getInfinitePayHandle();
  if (!handle) {
    return NextResponse.json({ error: "INFINITEPAY_HANDLE ausente no servidor." }, { status: 500 });
  }

  const payload = (await request.json()) as CheckoutPayload;
  const settings = getProgramSettings();
  const affiliate =
    payload.affiliate_id !== undefined
      ? getAffiliateById(Number(payload.affiliate_id))
      : payload.affiliate_code
        ? getAffiliateByCode(String(payload.affiliate_code).trim().toUpperCase())
        : undefined;

  if (!affiliate || affiliate.status !== "active") {
    return NextResponse.json({ error: "Afiliado invalido ou inativo." }, { status: 400 });
  }

  const customerName = String(payload.customer_name ?? "").trim();
  const customerEmail = String(payload.customer_email ?? "").trim().toLowerCase();
  const customerPhone = String(payload.customer_phone ?? "").trim() || null;
  if (!customerName || !customerEmail) {
    return NextResponse.json({ error: "customer_name e customer_email sao obrigatorios." }, { status: 400 });
  }

  const amountCents = Number.isFinite(payload.amount_cents) ? Number(payload.amount_cents) : settings.subscription_value_cents;
  const commissionCents = Number.isFinite(payload.commission_cents)
    ? Number(payload.commission_cents)
    : settings.commission_per_sale_cents;

  if (amountCents <= 0 || commissionCents < 0 || commissionCents > amountCents) {
    return NextResponse.json({ error: "Valores invalidos para assinatura/comissao." }, { status: 400 });
  }

  const orderNsu = buildOrderNsu();
  const redirectUrl = `${getAffiliateBaseUrl()}/pagamento/infinitepay/retorno?order_nsu=${encodeURIComponent(orderNsu)}`;
  const checkoutUrl = buildInfinitePayCheckoutUrl({
    handle,
    orderNsu,
    itemName: String(payload.item_name ?? "Assinatura CopyShield Pro"),
    amountCents,
    customerName,
    customerEmail,
    customerPhone,
    redirectUrl,
  });

  const order = createPaymentOrder({
    provider: INFINITEPAY_PROVIDER,
    orderNsu,
    affiliateId: affiliate.id,
    clickUid: payload.click_uid ? String(payload.click_uid) : null,
    customerName,
    customerEmail,
    customerPhone,
    amountCents,
    commissionCents,
    checkoutUrl,
    invoiceSlug: null,
  });

  return NextResponse.json({
    order_nsu: orderNsu,
    referral_id: order?.referral_id,
    checkout_url: checkoutUrl,
  });
}
