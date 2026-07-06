"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createAffiliateSession,
  createSession,
  destroyAffiliateSession,
  destroySession,
  requireAdmin,
  requireAffiliate,
} from "@/lib/auth";
import { db, getAffiliateByCode, getAffiliateByEmail, getAffiliateSummaries, getProgramSettings } from "@/lib/db";
import { parseCurrencyToCents } from "@/lib/money";
import { isoDate } from "@/lib/rules";

function asText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function requireText(formData: FormData, key: string) {
  const value = asText(formData, key);
  if (!value) throw new Error(`Campo obrigatorio: ${key}`);
  return value;
}

function asPositiveInt(formData: FormData, key: string, fallback: number) {
  const value = Number(asText(formData, key));
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
}

function requireUrl(formData: FormData, key: string) {
  const value = requireText(formData, key).replace(/\/$/, "");
  const parsed = new URL(value);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`URL invalida: ${key}`);
  }
  return parsed.toString().replace(/\/$/, "");
}

function parseFlowJson(value: string, key: string) {
  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed)) throw new Error(`${key} precisa ser uma lista.`);
  return JSON.stringify(parsed);
}

function normalizeAffiliateCode(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 10);
}

function createUniqueAffiliateCode(name: string) {
  const base = normalizeAffiliateCode(name) || "MEMBRO";
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = Math.floor(100 + Math.random() * 9000);
    const code = `${base.slice(0, 8)}${suffix}`;
    if (!getAffiliateByCode(code)) return code;
  }
  return `MEMBRO${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

export async function loginAction(formData: FormData) {
  const email = requireText(formData, "email").toLowerCase();
  const password = requireText(formData, "password");
  const ok = await createSession(email, password);
  if (!ok) redirect("/login?error=1");
  redirect("/");
}

export async function affiliateLoginAction(formData: FormData) {
  const email = requireText(formData, "email").toLowerCase();
  const password = requireText(formData, "password");
  const ok = await createAffiliateSession(email, password);
  if (!ok) redirect("/socio/login?error=1");
  redirect("/socio");
}

export async function affiliateLogoutAction() {
  await destroyAffiliateSession();
  redirect("/socio/login");
}

export async function affiliateUpdatePixKeyAction(formData: FormData) {
  const session = await requireAffiliate();
  const pixKey = requireText(formData, "pix_key");

  db.prepare("UPDATE affiliates SET pix_key = ? WHERE id = ?").run(pixKey, session.affiliateId);

  revalidatePath("/socio");
  redirect("/socio?pix=salvo");
}

const memberWalletOptions = [
  { field: "wallet_bitcoin", label: "Bitcoin", network: "Bitcoin", assetSymbol: "BTC" },
  { field: "wallet_bnb", label: "BNB Chain", network: "BNB Chain", assetSymbol: "USDT/USDC" },
  { field: "wallet_tron", label: "TRON", network: "TRON", assetSymbol: "USDT/TRX" },
  { field: "wallet_polygon", label: "Polygon", network: "Polygon", assetSymbol: "USDT/USDC" },
] as const;

export async function affiliateUpdateWalletsAction(formData: FormData) {
  const session = await requireAffiliate();
  const findWallet = db.prepare(
    `SELECT id
     FROM digital_wallets
     WHERE owner_type = 'affiliate'
       AND affiliate_id = ?
       AND network = ?
     ORDER BY id
     LIMIT 1`
  );
  const updateWallet = db.prepare(
    `UPDATE digital_wallets
     SET label = ?, asset_symbol = ?, address = ?, payout_mode = 'manual',
         status = 'active', notes = ?, created_at = created_at
     WHERE id = ?`
  );
  const insertWallet = db.prepare(
    `INSERT INTO digital_wallets (
      owner_type, affiliate_id, label, network, asset_symbol,
      address, payout_mode, status, notes
    ) VALUES ('affiliate', ?, ?, ?, ?, ?, 'manual', 'active', ?)`
  );
  const deleteDuplicateWallets = db.prepare(
    `DELETE FROM digital_wallets
     WHERE owner_type = 'affiliate'
       AND affiliate_id = ?
       AND network = ?
       AND id <> ?`
  );
  const deleteWalletByNetwork = db.prepare(
    `DELETE FROM digital_wallets
     WHERE owner_type = 'affiliate'
       AND affiliate_id = ?
       AND network = ?`
  );

  const transaction = db.transaction(() => {
    for (const wallet of memberWalletOptions) {
      const address = asText(formData, wallet.field);
      if (!address) {
        deleteWalletByNetwork.run(session.affiliateId, wallet.network);
        continue;
      }

      const label = `${wallet.label} - carteira do membro`;
      const notes = "Informada pelo portal do membro para recebimento de bonus descentralizado.";
      const existing = findWallet.get(session.affiliateId, wallet.network) as { id: number } | undefined;

      if (existing) {
        updateWallet.run(label, wallet.assetSymbol, address, notes, existing.id);
        deleteDuplicateWallets.run(session.affiliateId, wallet.network, existing.id);
      } else {
        insertWallet.run(session.affiliateId, label, wallet.network, wallet.assetSymbol, address, notes);
      }
    }
  });

  transaction();
  revalidatePath("/socio");
  revalidatePath("/");
  redirect("/socio?wallets=salvo");
}

export async function logoutAction() {
  await requireAdmin();
  await destroySession();
  redirect("/login");
}

export async function createAffiliateAction(formData: FormData) {
  await requireAdmin();
  const name = requireText(formData, "name");
  const email = requireText(formData, "email").toLowerCase();
  const phone = asText(formData, "phone");
  const code = requireText(formData, "code").toUpperCase().replace(/\s+/g, "");
  const password = asText(formData, "password");
  const passwordHash = password ? await bcrypt.hash(password, 10) : "";
  const pixKey = asText(formData, "pix_key");
  const sponsorIdValue = asText(formData, "sponsor_id");
  const sponsorId = sponsorIdValue ? Number(sponsorIdValue) : null;
  const notes = asText(formData, "notes");

  db.prepare(
    `INSERT INTO affiliates (sponsor_id, name, email, password_hash, phone, pix_key, code, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(sponsorId, name, email, passwordHash, phone || null, pixKey || null, code, notes || null);

  revalidatePath("/");
}

export async function publicAffiliateSignupAction(formData: FormData) {
  const name = requireText(formData, "name");
  const email = requireText(formData, "email").toLowerCase();
  const phone = asText(formData, "phone");
  const password = requireText(formData, "password");
  const passwordConfirm = requireText(formData, "password_confirm");
  const sponsorCode = asText(formData, "sponsor").toUpperCase().replace(/\s+/g, "");
  const sponsor = sponsorCode ? getAffiliateByCode(sponsorCode) : null;
  const existing = getAffiliateByEmail(email);

  if (password.length < 6 || password !== passwordConfirm) {
    redirect("/cadastro-membro?error=password");
  }

  if (existing?.password_hash) {
    redirect("/cadastro-membro?error=email");
  }

  if (sponsorCode && (!sponsor || sponsor.status !== "active")) {
    redirect("/cadastro-membro?error=sponsor");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  if (existing) {
    db.prepare(
      `UPDATE affiliates
       SET name = ?, phone = ?, password_hash = ?, sponsor_id = COALESCE(sponsor_id, ?),
           notes = COALESCE(notes, '') || ?
       WHERE id = ?`
    ).run(
      name,
      phone || null,
      passwordHash,
      sponsor?.id ?? null,
      " | Senha criada pelo formulario publico de membros.",
      existing.id
    );

    await createAffiliateSession(email, password);
    revalidatePath("/");
    redirect("/socio?cadastro=ok");
  }

  const code = createUniqueAffiliateCode(name);
  db.prepare(
    `INSERT INTO affiliates (sponsor_id, name, email, password_hash, phone, code, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    sponsor?.id ?? null,
    name,
    email,
    passwordHash,
    phone || null,
    code,
    "Cadastro criado pelo formulario publico de membros."
  );

  await createAffiliateSession(email, password);
  revalidatePath("/");
  redirect("/socio?cadastro=ok");
}

export async function createReferralAction(formData: FormData) {
  await requireAdmin();
  const settings = getProgramSettings();
  const affiliateId = Number(requireText(formData, "affiliate_id"));
  const customerName = requireText(formData, "customer_name");
  const customerEmail = requireText(formData, "customer_email").toLowerCase();
  const customerPhone = asText(formData, "customer_phone");
  const indicatedAt = asText(formData, "indicated_at") || isoDate();
  const paidAt = asText(formData, "paid_at") || null;
  const subscription = parseCurrencyToCents(formData.get("subscription_value"), settings.subscription_value_cents);
  const commission = parseCurrencyToCents(formData.get("commission"), settings.commission_per_sale_cents);
  const notes = asText(formData, "notes");

  db.prepare(
    `INSERT INTO referrals (
      affiliate_id, customer_name, customer_email, customer_phone, subscription_value_cents,
      commission_cents, indicated_at, paid_at, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(affiliateId, customerName, customerEmail, customerPhone || null, subscription, commission, indicatedAt, paidAt, notes || null);

  revalidatePath("/");
}

export async function markReferralPaidAction(formData: FormData) {
  await requireAdmin();
  const id = Number(requireText(formData, "id"));
  db.prepare("UPDATE referrals SET paid_at = COALESCE(paid_at, ?) WHERE id = ?").run(isoDate(), id);
  revalidatePath("/");
}

export async function blockReferralAction(formData: FormData) {
  await requireAdmin();
  const id = Number(requireText(formData, "id"));
  const reason = requireText(formData, "reason");
  const field = reason === "refund" ? "refunded_at" : "cancelled_at";
  db.prepare(`UPDATE referrals SET ${field} = ?, notes = COALESCE(notes, '') || ? WHERE id = ?`).run(
    isoDate(),
    ` | Bloqueado por ${reason} em ${isoDate()}`,
    id
  );
  revalidatePath("/");
}

export async function requestWithdrawalAction(formData: FormData) {
  await requireAdmin();
  const settings = getProgramSettings();
  const affiliateId = Number(requireText(formData, "affiliate_id"));
  const amount = parseCurrencyToCents(formData.get("amount"), 0);
  const affiliate = getAffiliateSummaries().find((item) => item.id === affiliateId);
  const pixKey = asText(formData, "pix_key") || affiliate?.pix_key || "";

  if (!pixKey) throw new Error("Chave PIX obrigatoria para solicitar saque.");

  if (!affiliate || amount <= 0 || amount > affiliate.available_cents || amount < settings.min_withdrawal_cents) {
    throw new Error("Valor de saque indisponivel para este membro.");
  }

  db.prepare("UPDATE affiliates SET pix_key = ? WHERE id = ?").run(pixKey, affiliateId);

  db.prepare(
    `INSERT INTO withdrawals (affiliate_id, amount_cents, pix_key, requested_at)
     VALUES (?, ?, ?, ?)`
  ).run(affiliateId, amount, pixKey, isoDate());

  revalidatePath("/");
}

export async function affiliateRequestWithdrawalAction(formData: FormData) {
  const session = await requireAffiliate();
  const settings = getProgramSettings();
  const amount = parseCurrencyToCents(formData.get("amount"), 0);
  const affiliate = getAffiliateSummaries().find((item) => item.id === session.affiliateId);
  const pixKey = asText(formData, "pix_key") || affiliate?.pix_key || "";

  if (!pixKey) throw new Error("Chave PIX obrigatoria para solicitar saque.");

  if (!affiliate || amount <= 0 || amount > affiliate.available_cents || amount < settings.min_withdrawal_cents) {
    throw new Error("Valor de saque indisponivel.");
  }

  db.prepare("UPDATE affiliates SET pix_key = ? WHERE id = ?").run(pixKey, session.affiliateId);

  db.prepare(
    `INSERT INTO withdrawals (affiliate_id, amount_cents, pix_key, requested_at, notes)
     VALUES (?, ?, ?, ?, ?)`
  ).run(session.affiliateId, amount, pixKey, isoDate(), "Solicitado pelo portal do membro.");

  revalidatePath("/socio");
  redirect("/socio?saque=solicitado");
}

export async function payWithdrawalAction(formData: FormData) {
  await requireAdmin();
  const id = Number(requireText(formData, "id"));
  db.prepare("UPDATE withdrawals SET status = 'paid', paid_at = ? WHERE id = ?").run(isoDate(), id);
  revalidatePath("/");
}

export async function updateProgramSettingsAction(formData: FormData) {
  await requireAdmin();
  const current = getProgramSettings();
  const strategyName = requireText(formData, "strategy_name");
  const subscription = parseCurrencyToCents(formData.get("subscription_value"), current.subscription_value_cents);
  const commission = parseCurrencyToCents(formData.get("commission"), current.commission_per_sale_cents);
  const holdDays = asPositiveInt(formData, "hold_days", current.hold_days);
  const freeTarget = asPositiveInt(formData, "free_access_sales_target", current.free_access_sales_target);
  const freeWindow = asPositiveInt(formData, "free_access_window_days", current.free_access_window_days);
  const minWithdrawal = parseCurrencyToCents(formData.get("min_withdrawal"), current.min_withdrawal_cents);
  const allowDigitalWallets = formData.get("allow_digital_wallets") === "on" ? 1 : 0;
  const networkBonusPercent = Math.min(100, asPositiveInt(formData, "network_bonus_percent", current.network_bonus_percent));
  const affiliatePublicBaseUrl = requireUrl(formData, "affiliate_public_base_url");
  const signupTargetUrl = requireUrl(formData, "signup_target_url");
  const tradeShieldSignupUrl = requireUrl(formData, "tradeshield_signup_url");
  const fraudPolicy = requireText(formData, "fraud_policy");
  const payoutPolicy = requireText(formData, "payout_policy");

  db.prepare(
    `UPDATE program_settings
     SET strategy_name = ?, subscription_value_cents = ?, commission_per_sale_cents = ?,
         hold_days = ?, free_access_sales_target = ?, free_access_window_days = ?,
         min_withdrawal_cents = ?, allow_digital_wallets = ?, network_bonus_percent = ?, affiliate_public_base_url = ?,
         signup_target_url = ?, tradeshield_signup_url = ?, fraud_policy = ?, payout_policy = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = 1`
  ).run(
    strategyName,
    subscription,
    commission,
    holdDays,
    freeTarget,
    freeWindow,
    minWithdrawal,
    allowDigitalWallets,
    networkBonusPercent,
    affiliatePublicBaseUrl,
    signupTargetUrl,
    tradeShieldSignupUrl,
    fraudPolicy,
    payoutPolicy
  );

  revalidatePath("/");
}

export async function createPaymentIntegrationAction(formData: FormData) {
  await requireAdmin();
  const name = requireText(formData, "name");
  const provider = requireText(formData, "provider");
  const checkoutUrl = asText(formData, "checkout_url");
  const webhookUrl = asText(formData, "webhook_url");
  const publicKeyRef = asText(formData, "public_key_ref");
  const secretRef = asText(formData, "secret_ref");
  const status = asText(formData, "status") || "draft";
  const settlementCurrency = (asText(formData, "settlement_currency") || "BRL").toUpperCase();
  const notes = asText(formData, "notes");

  db.prepare(
    `INSERT INTO payment_integrations (
      name, provider, checkout_url, webhook_url, public_key_ref,
      secret_ref, status, settlement_currency, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    name,
    provider,
    checkoutUrl || null,
    webhookUrl || null,
    publicKeyRef || null,
    secretRef || null,
    status,
    settlementCurrency,
    notes || null
  );

  revalidatePath("/");
}

export async function createDigitalWalletAction(formData: FormData) {
  await requireAdmin();
  const ownerType = asText(formData, "owner_type") || "platform";
  const affiliateIdValue = asText(formData, "affiliate_id");
  const affiliateId = ownerType === "affiliate" && affiliateIdValue ? Number(affiliateIdValue) : null;
  const label = requireText(formData, "label");
  const network = requireText(formData, "network");
  const assetSymbol = requireText(formData, "asset_symbol").toUpperCase();
  const address = requireText(formData, "address");
  const payoutMode = asText(formData, "payout_mode") || "manual";
  const status = asText(formData, "status") || "active";
  const notes = asText(formData, "notes");

  db.prepare(
    `INSERT INTO digital_wallets (
      owner_type, affiliate_id, label, network, asset_symbol,
      address, payout_mode, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(ownerType, affiliateId, label, network, assetSymbol, address, payoutMode, status, notes || null);

  revalidatePath("/");
}

export async function saveStrategyFlowAction(formData: FormData) {
  await requireAdmin();
  const name = requireText(formData, "name");
  const nodesJson = parseFlowJson(requireText(formData, "nodes_json"), "nodes_json");
  const edgesJson = parseFlowJson(requireText(formData, "edges_json"), "edges_json");

  db.prepare(
    `UPDATE strategy_flows
     SET name = ?, nodes_json = ?, edges_json = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = 1`
  ).run(name, nodesJson, edgesJson);

  revalidatePath("/");
}
