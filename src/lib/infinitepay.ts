import { randomUUID } from "node:crypto";

export const INFINITEPAY_PROVIDER = "infinitepay";

export function getInfinitePayHandle() {
  return (process.env.INFINITEPAY_HANDLE ?? "").trim().replace(/^@/, "");
}

export function getInfinitePayWebhookSecret() {
  return (process.env.INFINITEPAY_WEBHOOK_SECRET ?? "").trim();
}

export function buildOrderNsu(prefix = "pm") {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}

export function buildInfinitePayCheckoutUrl(input: {
  handle: string;
  orderNsu: string;
  itemName: string;
  amountCents: number;
  quantity?: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  redirectUrl: string;
}) {
  const base = new URL(`https://checkout.infinitepay.io/${encodeURIComponent(input.handle)}`);
  const quantity = input.quantity ?? 1;

  base.searchParams.set(
    "items",
    JSON.stringify([
      {
        name: input.itemName,
        price: input.amountCents,
        quantity,
      },
    ])
  );
  base.searchParams.set("order_nsu", input.orderNsu);
  base.searchParams.set("redirect_url", input.redirectUrl);
  base.searchParams.set("customer_name", input.customerName);
  base.searchParams.set("customer_email", input.customerEmail);
  if (input.customerPhone) base.searchParams.set("customer_cellphone", input.customerPhone);

  return base.toString();
}

export function readInfinitePayOrderNsu(payload: Record<string, unknown>) {
  return firstString(payload, ["order_nsu", "orderNsu", "reference", "external_reference", "externalReference"]);
}

export function readInfinitePayTransactionNsu(payload: Record<string, unknown>) {
  return firstString(payload, ["transaction_nsu", "transactionNsu", "transaction_id", "transactionId", "nsu"]);
}

export function readInfinitePayReceiptUrl(payload: Record<string, unknown>) {
  return firstString(payload, ["receipt_url", "receiptUrl", "comprovante_url", "comprovanteUrl"]);
}

export function readInfinitePayCaptureMethod(payload: Record<string, unknown>) {
  return firstString(payload, ["payment_method", "paymentMethod", "capture_method", "captureMethod", "method"]);
}

export function isInfinitePayPaidStatus(payload: Record<string, unknown>) {
  const status = firstString(payload, ["status", "transaction_status", "transactionStatus", "payment_status", "paymentStatus"]);
  if (!status) return false;
  return ["paid", "approved", "confirmed", "completed", "authorized", "success", "succeeded"].includes(status.toLowerCase());
}

function firstString(payload: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}
