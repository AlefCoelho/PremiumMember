export const SUBSCRIPTION_VALUE_CENTS = 3100;
export const COMMISSION_PER_SALE_CENTS = 1000;
export const HOLD_DAYS = 7;
export const FREE_ACCESS_SALES_TARGET = 3;
export const FREE_ACCESS_WINDOW_DAYS = 30;
export const MIN_WITHDRAWAL_CENTS = 3000;
export const NETWORK_BONUS_PERCENT = 20;

export type ProgramSettings = {
  id: number;
  strategy_name: string;
  subscription_value_cents: number;
  commission_per_sale_cents: number;
  hold_days: number;
  free_access_sales_target: number;
  free_access_window_days: number;
  min_withdrawal_cents: number;
  allow_digital_wallets: number;
  network_bonus_percent: number;
  affiliate_public_base_url: string;
  signup_target_url: string;
  tradeshield_signup_url: string;
  fraud_policy: string;
  payout_policy: string;
  updated_at: string;
};

export type ReferralStatus = "pending" | "paid" | "eligible" | "blocked";

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function isoDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function daysBetween(start: Date, end: Date) {
  const ms = end.getTime() - start.getTime();
  return Math.ceil(ms / 86_400_000);
}

export function getReferralStatus(input: {
  paid_at?: string | null;
  refunded_at?: string | null;
  cancelled_at?: string | null;
  paidAt?: string | null;
  refundedAt?: string | null;
  cancelledAt?: string | null;
  holdDays?: number;
  now?: Date;
}): ReferralStatus {
  const paidAt = input.paidAt ?? input.paid_at ?? null;
  const refundedAt = input.refundedAt ?? input.refunded_at ?? null;
  const cancelledAt = input.cancelledAt ?? input.cancelled_at ?? null;

  if (refundedAt || cancelledAt) return "blocked";
  if (!paidAt) return "pending";

  const deadline = addDays(new Date(`${paidAt}T00:00:00`), input.holdDays ?? HOLD_DAYS);
  const now = input.now ?? new Date();
  return now >= deadline ? "eligible" : "paid";
}

export function getHoldDeadline(paidAt: string | null, holdDays = HOLD_DAYS) {
  if (!paidAt) return null;
  return isoDate(addDays(new Date(`${paidAt}T00:00:00`), holdDays));
}

export function getAccessWindowStart(now = new Date(), windowDays = FREE_ACCESS_WINDOW_DAYS) {
  return isoDate(addDays(now, -windowDays));
}
