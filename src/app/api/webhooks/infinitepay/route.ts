import { NextRequest, NextResponse } from "next/server";
import { validateWebhookSecret } from "@/lib/api-security";
import {
  getPaymentOrderByOrderNsu,
  markPaymentOrderPaid,
} from "@/lib/db";
import {
  isInfinitePayPaidStatus,
  readInfinitePayCaptureMethod,
  readInfinitePayOrderNsu,
  readInfinitePayReceiptUrl,
  readInfinitePayTransactionNsu,
} from "@/lib/infinitepay";

export async function POST(request: NextRequest) {
  if (!validateWebhookSecret(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const orderNsu = readInfinitePayOrderNsu(payload);
  if (!orderNsu) {
    return NextResponse.json({ error: "order_nsu ausente." }, { status: 400 });
  }

  const order = getPaymentOrderByOrderNsu(orderNsu);
  if (!order) {
    return NextResponse.json({ error: "Pedido nao encontrado." }, { status: 404 });
  }

  if (!isInfinitePayPaidStatus(payload)) {
    return NextResponse.json({ ok: true, status: "ignored" });
  }

  const updated = markPaymentOrderPaid({
    orderNsu,
    transactionNsu: readInfinitePayTransactionNsu(payload),
    receiptUrl: readInfinitePayReceiptUrl(payload),
    captureMethod: readInfinitePayCaptureMethod(payload),
    rawPayload: payload,
  });

  return NextResponse.json({
    ok: true,
    status: updated?.status ?? "paid",
    order_nsu: orderNsu,
  });
}
