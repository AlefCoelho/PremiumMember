export function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function parseCurrencyToCents(value: FormDataEntryValue | null, fallback = 0) {
  if (!value) return fallback;
  const normalized = String(value).replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const amount = Number(normalized);
  if (!Number.isFinite(amount)) return fallback;
  return Math.round(amount * 100);
}
