import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import fs from "node:fs";
import path from "node:path";
import {
  COMMISSION_PER_SALE_CENTS,
  FREE_ACCESS_SALES_TARGET,
  FREE_ACCESS_WINDOW_DAYS,
  MIN_WITHDRAWAL_CENTS,
  NETWORK_BONUS_PERCENT,
  SUBSCRIPTION_VALUE_CENTS,
  type ProgramSettings,
  getAccessWindowStart,
  getReferralStatus,
  isoDate,
} from "@/lib/rules";

const dbPath = process.env.SOCIOS_DB_PATH ?? path.join(process.cwd(), "data", "socios-premiums.sqlite");
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

sqlite.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS affiliates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sponsor_id INTEGER REFERENCES affiliates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL DEFAULT '',
  phone TEXT,
  pix_key TEXT,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS referrals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  affiliate_id INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  subscription_value_cents INTEGER NOT NULL DEFAULT ${SUBSCRIPTION_VALUE_CENTS},
  commission_cents INTEGER NOT NULL DEFAULT ${COMMISSION_PER_SALE_CENTS},
  indicated_at TEXT NOT NULL,
  paid_at TEXT,
  refunded_at TEXT,
  cancelled_at TEXT,
  payment_provider TEXT,
  payment_order_nsu TEXT,
  payment_transaction_nsu TEXT,
  payment_receipt_url TEXT,
  payment_method TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  affiliate_id INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  pix_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  requested_at TEXT NOT NULL,
  paid_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS program_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  strategy_name TEXT NOT NULL,
  subscription_value_cents INTEGER NOT NULL,
  commission_per_sale_cents INTEGER NOT NULL,
  hold_days INTEGER NOT NULL,
  free_access_sales_target INTEGER NOT NULL,
  free_access_window_days INTEGER NOT NULL,
  min_withdrawal_cents INTEGER NOT NULL,
  allow_digital_wallets INTEGER NOT NULL DEFAULT 1,
  network_bonus_percent INTEGER NOT NULL DEFAULT ${NETWORK_BONUS_PERCENT},
  affiliate_public_base_url TEXT NOT NULL DEFAULT '',
  signup_target_url TEXT NOT NULL DEFAULT '',
  tradeshield_signup_url TEXT NOT NULL DEFAULT '',
  fraud_policy TEXT NOT NULL,
  payout_policy TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_integrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  checkout_url TEXT,
  webhook_url TEXT,
  public_key_ref TEXT,
  secret_ref TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  settlement_currency TEXT NOT NULL DEFAULT 'BRL',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payment_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,
  order_nsu TEXT NOT NULL UNIQUE,
  referral_id INTEGER REFERENCES referrals(id) ON DELETE SET NULL,
  affiliate_id INTEGER REFERENCES affiliates(id) ON DELETE SET NULL,
  click_uid TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  amount_cents INTEGER NOT NULL,
  commission_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  checkout_url TEXT,
  invoice_slug TEXT,
  transaction_nsu TEXT,
  receipt_url TEXT,
  capture_method TEXT,
  raw_payload TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at TEXT
);

CREATE TABLE IF NOT EXISTS digital_wallets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_type TEXT NOT NULL DEFAULT 'platform',
  affiliate_id INTEGER REFERENCES affiliates(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  network TEXT NOT NULL,
  asset_symbol TEXT NOT NULL,
  address TEXT NOT NULL,
  payout_mode TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS strategy_flows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  nodes_json TEXT NOT NULL,
  edges_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  affiliate_id INTEGER NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
  click_uid TEXT,
  product_slug TEXT NOT NULL DEFAULT 'copyshieldpro',
  affiliate_code TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  source_url TEXT,
  target_url TEXT NOT NULL,
  clicked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

function ensureColumn(table: string, column: string, definition: string) {
  const columns = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((item) => item.name === column)) {
    sqlite.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
}

ensureColumn("affiliate_clicks", "click_uid", "TEXT");
ensureColumn("affiliate_clicks", "product_slug", "TEXT NOT NULL DEFAULT 'copyshieldpro'");
ensureColumn("affiliates", "sponsor_id", "INTEGER REFERENCES affiliates(id) ON DELETE SET NULL");
ensureColumn("affiliates", "password_hash", "TEXT NOT NULL DEFAULT ''");
ensureColumn("affiliates", "pix_key", "TEXT");
ensureColumn("program_settings", "affiliate_public_base_url", "TEXT NOT NULL DEFAULT ''");
ensureColumn("program_settings", "signup_target_url", "TEXT NOT NULL DEFAULT ''");
ensureColumn("program_settings", "tradeshield_signup_url", "TEXT NOT NULL DEFAULT ''");
ensureColumn("program_settings", "network_bonus_percent", `INTEGER NOT NULL DEFAULT ${NETWORK_BONUS_PERCENT}`);
ensureColumn("referrals", "payment_provider", "TEXT");
ensureColumn("referrals", "payment_order_nsu", "TEXT");
ensureColumn("referrals", "payment_transaction_nsu", "TEXT");
ensureColumn("referrals", "payment_receipt_url", "TEXT");
ensureColumn("referrals", "payment_method", "TEXT");
ensureColumn("referrals", "customer_phone", "TEXT");

const adminEmail = process.env.ADMIN_EMAIL ?? "admin@premiummember.local";
const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";
const defaultAffiliatePublicBaseUrl = process.env.AFFILIATE_PUBLIC_BASE_URL ?? "http://127.0.0.1:3100";
const defaultSignupTargetUrl = process.env.COPYSHIELD_SIGNUP_URL ?? "https://app.copyshieldpro.com/register";
const defaultTradeShieldSignupUrl =
  process.env.TRADESHIELD_SIGNUP_URL ?? "https://apptradeshield.online/login?tab=register";
sqlite
  .prepare("INSERT OR IGNORE INTO admins (email, password_hash) VALUES (?, ?)")
  .run(adminEmail, bcrypt.hashSync(adminPassword, 10));

sqlite
  .prepare(
    `INSERT OR IGNORE INTO program_settings (
      id, strategy_name, subscription_value_cents, commission_per_sale_cents,
      hold_days, free_access_sales_target, free_access_window_days,
      min_withdrawal_cents, allow_digital_wallets, network_bonus_percent, affiliate_public_base_url,
      signup_target_url, tradeshield_signup_url, fraud_policy, payout_policy
    ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  .run(
    "3 vendas validadas",
    SUBSCRIPTION_VALUE_CENTS,
    COMMISSION_PER_SALE_CENTS,
    7,
    FREE_ACCESS_SALES_TARGET,
    FREE_ACCESS_WINDOW_DAYS,
    MIN_WITHDRAWAL_CENTS,
    1,
    NETWORK_BONUS_PERCENT,
    defaultAffiliatePublicBaseUrl,
    defaultSignupTargetUrl,
    defaultTradeShieldSignupUrl,
    "Cliente unico por e-mail/CPF, sem autoindicacao e com bloqueio em caso de reembolso ou cancelamento.",
    "Comissao so fica disponivel depois da carencia. Saques manuais por PIX ou carteira digital aprovada."
  );

sqlite
  .prepare(
    `UPDATE program_settings
     SET affiliate_public_base_url = CASE
           WHEN affiliate_public_base_url = '' THEN ?
           ELSE affiliate_public_base_url
         END,
         signup_target_url = CASE
           WHEN signup_target_url = '' THEN ?
           ELSE signup_target_url
         END,
         tradeshield_signup_url = CASE
           WHEN tradeshield_signup_url = '' THEN ?
           ELSE tradeshield_signup_url
         END
     WHERE id = 1`
  )
  .run(defaultAffiliatePublicBaseUrl, defaultSignupTargetUrl, defaultTradeShieldSignupUrl);

const defaultStrategyNodes = JSON.stringify([
  {
    id: "trigger-referral",
    type: "strategyNode",
    position: { x: 180, y: 140 },
    data: {
      kind: "Gatilho",
      title: "Nova indicacao",
      description: "Membro indicou um novo cliente para assinatura.",
      tone: "blue",
    },
  },
  {
    id: "payment-confirmed",
    type: "strategyNode",
    position: { x: 450, y: 140 },
    data: {
      kind: "Pagamento",
      title: "Pagamento confirmado",
      description: "Gateway, PIX manual ou carteira digital confirmou a assinatura.",
      tone: "green",
    },
  },
  {
    id: "hold-period",
    type: "strategyNode",
    position: { x: 720, y: 140 },
    data: {
      kind: "Espera",
      title: "Carencia de 7 dias",
      description: "A venda fica bloqueada contra reembolso e fraude.",
      tone: "amber",
    },
  },
  {
    id: "refund-check",
    type: "strategyNode",
    position: { x: 990, y: 140 },
    data: {
      kind: "Condicao",
      title: "Teve reembolso?",
      description: "Se sim, bloqueia comissao. Se nao, libera a venda.",
      tone: "red",
    },
  },
  {
    id: "release-commission",
    type: "strategyNode",
    position: { x: 1260, y: 50 },
    data: {
      kind: "Acao",
      title: "Liberar R$10",
      description: "Comissao entra no saldo disponivel do membro.",
      tone: "green",
    },
  },
  {
    id: "block-commission",
    type: "strategyNode",
    position: { x: 1260, y: 250 },
    data: {
      kind: "Acao",
      title: "Bloquear venda",
      description: "Remove venda da contagem de comissao e mes gratis.",
      tone: "red",
    },
  },
  {
    id: "free-access-check",
    type: "strategyNode",
    position: { x: 1530, y: 50 },
    data: {
      kind: "Condicao",
      title: "Bateu 3 vendas em 30 dias?",
      description: "Conta somente vendas liberadas dentro da janela.",
      tone: "blue",
    },
  },
  {
    id: "grant-access",
    type: "strategyNode",
    position: { x: 1800, y: 50 },
    data: {
      kind: "Acao",
      title: "Liberar 30 dias gratis",
      description: "Membro recebe acesso premium e pode solicitar saque.",
      tone: "green",
    },
  },
]);

const defaultStrategyEdges = JSON.stringify([
  { id: "e1", source: "trigger-referral", target: "payment-confirmed", animated: true },
  { id: "e2", source: "payment-confirmed", target: "hold-period", animated: true },
  { id: "e3", source: "hold-period", target: "refund-check", animated: true },
  { id: "e4", source: "refund-check", target: "release-commission", label: "Nao" },
  { id: "e5", source: "refund-check", target: "block-commission", label: "Sim" },
  { id: "e6", source: "release-commission", target: "free-access-check" },
  { id: "e7", source: "free-access-check", target: "grant-access", label: "Sim" },
]);

sqlite
  .prepare(
    `INSERT OR IGNORE INTO strategy_flows (id, name, nodes_json, edges_json, status)
     VALUES (1, ?, ?, ?, 'active')`
  )
  .run("Funil principal de afiliados", defaultStrategyNodes, defaultStrategyEdges);

sqlite
  .prepare(
    `UPDATE strategy_flows
     SET nodes_json = ?, edges_json = ?
     WHERE id = 1
       AND name = 'Funil principal de afiliados'
       AND (nodes_json LIKE '%"x":1900%' OR nodes_json LIKE '%"x":0%')`
  )
  .run(defaultStrategyNodes, defaultStrategyEdges);

const treasuryWallets = [
  {
    label: "Tesouraria Polygon - USDT/USDC",
    network: "Polygon",
    assetSymbol: "USDT/USDC",
    address: "0x90057fB50F187D57a1d8CD691E03396A8fF6cfc2",
  },
  {
    label: "Tesouraria TRON - USDT/TRX",
    network: "TRON",
    assetSymbol: "USDT/TRX",
    address: "TZ1D81KU422ddzmk6byXW5kw5rv9neGQTT",
  },
  {
    label: "Tesouraria BNB Chain - USDT/USDC",
    network: "BNB Chain",
    assetSymbol: "USDT/USDC",
    address: "0x90057fB50F187D57a1d8CD691E03396A8fF6cfc2",
  },
  {
    label: "Tesouraria Bitcoin - BTC",
    network: "Bitcoin",
    assetSymbol: "BTC",
    address: "bc1qruj3tkn3t48jxr87t838uvtsv5hv35s7ehrzcm",
  },
];

const existingWallet = sqlite.prepare(
  `SELECT id FROM digital_wallets
   WHERE owner_type = 'platform'
     AND network = ?
     AND asset_symbol = ?
     AND address = ?
   LIMIT 1`
);
const insertTreasuryWallet = sqlite.prepare(
  `INSERT INTO digital_wallets (
    owner_type, affiliate_id, label, network, asset_symbol,
    address, payout_mode, status, notes
  ) VALUES ('platform', NULL, ?, ?, ?, ?, 'review', 'active', ?)`
);

for (const wallet of treasuryWallets) {
  const exists = existingWallet.get(wallet.network, wallet.assetSymbol, wallet.address);
  if (!exists) {
    insertTreasuryWallet.run(
      wallet.label,
      wallet.network,
      wallet.assetSymbol,
      wallet.address,
      "Endereco publico da tesouraria Premium Member. Nao armazenar seed phrase, chave privada ou senha no sistema."
    );
  }
}

export const db = sqlite;

export type AffiliateSummary = {
  id: number;
  sponsor_id: number | null;
  sponsor_name: string | null;
  name: string;
  email: string;
  phone: string | null;
  pix_key: string | null;
  code: string;
  status: string;
  notes: string | null;
  created_at: string;
  total_referrals: number;
  pending_referrals: number;
  hold_referrals: number;
  paid_referrals: number;
  eligible_referrals: number;
  blocked_referrals: number;
  pending_sales_cents: number;
  hold_sales_cents: number;
  eligible_sales_cents: number;
  gross_sales_cents: number;
  commission_earned_cents: number;
  direct_commission_cents: number;
  network_bonus_cents: number;
  direct_member_count: number;
  network_eligible_sales: number;
  withdrawn_cents: number;
  available_cents: number;
  free_access_credits: number;
  click_count: number;
  last_click_at: string | null;
};

export type ReferralRow = {
  id: number;
  affiliate_id: number;
  affiliate_name: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  subscription_value_cents: number;
  commission_cents: number;
  indicated_at: string;
  paid_at: string | null;
  refunded_at: string | null;
  cancelled_at: string | null;
  notes: string | null;
};

export type NetworkMemberRow = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  code: string;
  status: string;
  created_at: string;
  paid_referrals: number;
  eligible_referrals: number;
  network_bonus_cents: number;
};

export type WithdrawalRow = {
  id: number;
  affiliate_id: number;
  affiliate_name: string;
  amount_cents: number;
  pix_key: string;
  status: string;
  requested_at: string;
  paid_at: string | null;
  notes: string | null;
};

export type PaymentIntegrationRow = {
  id: number;
  name: string;
  provider: string;
  checkout_url: string | null;
  webhook_url: string | null;
  public_key_ref: string | null;
  secret_ref: string | null;
  status: string;
  settlement_currency: string;
  notes: string | null;
  created_at: string;
};

export type PaymentOrderRow = {
  id: number;
  provider: string;
  order_nsu: string;
  referral_id: number | null;
  affiliate_id: number | null;
  click_uid: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  amount_cents: number;
  commission_cents: number;
  status: string;
  checkout_url: string | null;
  invoice_slug: string | null;
  transaction_nsu: string | null;
  receipt_url: string | null;
  capture_method: string | null;
  raw_payload: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
};

export type DigitalWalletRow = {
  id: number;
  owner_type: string;
  affiliate_id: number | null;
  affiliate_name: string | null;
  label: string;
  network: string;
  asset_symbol: string;
  address: string;
  payout_mode: string;
  status: string;
  notes: string | null;
  created_at: string;
};

export type StrategyFlowRow = {
  id: number;
  name: string;
  nodes_json: string;
  edges_json: string;
  status: string;
  updated_at: string;
  created_at: string;
};

export function getAdminByEmail(email: string) {
  return sqlite.prepare("SELECT * FROM admins WHERE email = ?").get(email) as
    | { id: number; email: string; password_hash: string }
    | undefined;
}

export function getAffiliateByCode(code: string) {
  return sqlite.prepare("SELECT * FROM affiliates WHERE code = ? COLLATE NOCASE").get(code) as
    | {
        id: number;
        sponsor_id: number | null;
        name: string;
        email: string;
        phone: string | null;
        pix_key: string | null;
        code: string;
        status: string;
      }
    | undefined;
}

export function getAffiliateById(id: number) {
  return sqlite.prepare("SELECT * FROM affiliates WHERE id = ?").get(id) as
    | {
        id: number;
        sponsor_id: number | null;
        name: string;
        email: string;
        phone: string | null;
        pix_key: string | null;
        code: string;
        status: string;
      }
    | undefined;
}

export function getAffiliateByEmail(email: string) {
  return sqlite.prepare("SELECT * FROM affiliates WHERE email = ? COLLATE NOCASE").get(email) as
    | {
        id: number;
        sponsor_id: number | null;
        name: string;
        email: string;
        password_hash: string;
        phone: string | null;
        code: string;
        status: string;
      }
    | undefined;
}

export function getAffiliateByEmailAndCode(email: string, code: string) {
  return sqlite
    .prepare("SELECT * FROM affiliates WHERE email = ? COLLATE NOCASE AND code = ? COLLATE NOCASE")
    .get(email, code) as
    | {
        id: number;
        sponsor_id: number | null;
        name: string;
        email: string;
        password_hash: string;
        phone: string | null;
        code: string;
        status: string;
      }
    | undefined;
}

export function recordAffiliateClick(input: {
  affiliateId: number;
  clickUid: string;
  productSlug: string;
  affiliateCode: string;
  ipAddress: string | null;
  userAgent: string | null;
  sourceUrl: string | null;
  targetUrl: string;
}) {
  sqlite
    .prepare(
      `INSERT INTO affiliate_clicks (
        affiliate_id, click_uid, product_slug, affiliate_code, ip_address, user_agent, source_url, target_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.affiliateId,
      input.clickUid,
      input.productSlug,
      input.affiliateCode,
      input.ipAddress,
      input.userAgent,
      input.sourceUrl,
      input.targetUrl
    );
}

export function getReferrals(): ReferralRow[] {
  return sqlite
    .prepare(
      `SELECT referrals.*, affiliates.name as affiliate_name
       FROM referrals
       JOIN affiliates ON affiliates.id = referrals.affiliate_id
       ORDER BY COALESCE(referrals.paid_at, referrals.indicated_at) DESC, referrals.id DESC`
    )
    .all() as ReferralRow[];
}

export function getWithdrawals(): WithdrawalRow[] {
  return sqlite
    .prepare(
      `SELECT withdrawals.*, affiliates.name as affiliate_name
       FROM withdrawals
       JOIN affiliates ON affiliates.id = withdrawals.affiliate_id
       ORDER BY withdrawals.requested_at DESC, withdrawals.id DESC`
    )
    .all() as WithdrawalRow[];
}

export function getProgramSettings(): ProgramSettings {
  return sqlite.prepare("SELECT * FROM program_settings WHERE id = 1").get() as ProgramSettings;
}

export function getPaymentIntegrations(): PaymentIntegrationRow[] {
  return sqlite
    .prepare("SELECT * FROM payment_integrations ORDER BY created_at DESC, id DESC")
    .all() as PaymentIntegrationRow[];
}

export function getPaymentOrders(): PaymentOrderRow[] {
  return sqlite
    .prepare("SELECT * FROM payment_orders ORDER BY created_at DESC, id DESC LIMIT 100")
    .all() as PaymentOrderRow[];
}

export function getPaymentOrderByOrderNsu(orderNsu: string) {
  return sqlite.prepare("SELECT * FROM payment_orders WHERE order_nsu = ?").get(orderNsu) as PaymentOrderRow | undefined;
}

export function createPaymentOrder(input: {
  provider: string;
  orderNsu: string;
  affiliateId: number;
  clickUid: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  amountCents: number;
  commissionCents: number;
  checkoutUrl: string;
  invoiceSlug: string | null;
}) {
  const insertReferral = sqlite.prepare(`
    INSERT INTO referrals (
      affiliate_id, customer_name, customer_email, customer_phone, subscription_value_cents,
      commission_cents, indicated_at, payment_provider, payment_order_nsu, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertOrder = sqlite.prepare(`
    INSERT INTO payment_orders (
      provider, order_nsu, referral_id, affiliate_id, click_uid, customer_name,
      customer_email, customer_phone, amount_cents, commission_cents, checkout_url, invoice_slug
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = sqlite.transaction(() => {
    const referral = insertReferral.run(
      input.affiliateId,
      input.customerName,
      input.customerEmail,
      input.customerPhone,
      input.amountCents,
      input.commissionCents,
      isoDate(),
      input.provider,
      input.orderNsu,
      `Checkout ${input.provider} criado para ${input.orderNsu}.`
    );

    insertOrder.run(
      input.provider,
      input.orderNsu,
      Number(referral.lastInsertRowid),
      input.affiliateId,
      input.clickUid,
      input.customerName,
      input.customerEmail,
      input.customerPhone,
      input.amountCents,
      input.commissionCents,
      input.checkoutUrl,
      input.invoiceSlug
    );

    return getPaymentOrderByOrderNsu(input.orderNsu);
  });

  return transaction();
}

export function markPaymentOrderPaid(input: {
  orderNsu: string;
  transactionNsu: string | null;
  receiptUrl: string | null;
  captureMethod: string | null;
  rawPayload: unknown;
}) {
  const order = getPaymentOrderByOrderNsu(input.orderNsu);
  if (!order) return null;

  const paidAt = isoDate();
  const rawPayload = JSON.stringify(input.rawPayload ?? {});
  const transaction = sqlite.transaction(() => {
    sqlite
      .prepare(
        `UPDATE payment_orders
         SET status = 'paid', transaction_nsu = COALESCE(?, transaction_nsu),
             receipt_url = COALESCE(?, receipt_url), capture_method = COALESCE(?, capture_method),
             raw_payload = ?, paid_at = COALESCE(paid_at, ?), updated_at = CURRENT_TIMESTAMP
         WHERE order_nsu = ?`
      )
      .run(input.transactionNsu, input.receiptUrl, input.captureMethod, rawPayload, paidAt, input.orderNsu);

    if (order.referral_id) {
      sqlite
        .prepare(
          `UPDATE referrals
           SET paid_at = COALESCE(paid_at, ?), payment_transaction_nsu = COALESCE(?, payment_transaction_nsu),
               payment_receipt_url = COALESCE(?, payment_receipt_url), payment_method = COALESCE(?, payment_method),
               notes = COALESCE(notes, '') || ?
           WHERE id = ?`
        )
        .run(
          paidAt,
          input.transactionNsu,
          input.receiptUrl,
          input.captureMethod,
          ` | Pagamento confirmado por ${order.provider} em ${paidAt}.`,
          order.referral_id
        );
    }

    return getPaymentOrderByOrderNsu(input.orderNsu);
  });

  return transaction();
}

export function getDigitalWallets(): DigitalWalletRow[] {
  return sqlite
    .prepare(
      `SELECT digital_wallets.*, affiliates.name as affiliate_name
       FROM digital_wallets
       LEFT JOIN affiliates ON affiliates.id = digital_wallets.affiliate_id
       ORDER BY digital_wallets.created_at DESC, digital_wallets.id DESC`
    )
    .all() as DigitalWalletRow[];
}

export function getActiveStrategyFlow(): StrategyFlowRow {
  return sqlite.prepare("SELECT * FROM strategy_flows WHERE status = 'active' ORDER BY id LIMIT 1").get() as StrategyFlowRow;
}

export function getAffiliateSummaries(): AffiliateSummary[] {
  const settings = getProgramSettings();
  const affiliates = sqlite.prepare("SELECT * FROM affiliates ORDER BY created_at DESC, id DESC").all() as Array<{
    id: number;
    sponsor_id: number | null;
    name: string;
    email: string;
    phone: string | null;
    pix_key: string | null;
    code: string;
    status: string;
    notes: string | null;
    created_at: string;
  }>;

  const referrals = getReferrals();
  const withdrawals = getWithdrawals();
  const clickRows = sqlite
    .prepare(
      `SELECT affiliate_id, COUNT(*) as click_count, MAX(clicked_at) as last_click_at
       FROM affiliate_clicks
       GROUP BY affiliate_id`
    )
    .all() as Array<{ affiliate_id: number; click_count: number; last_click_at: string | null }>;
  const windowStart = getAccessWindowStart(new Date(), settings.free_access_window_days);
  const affiliateById = new Map(affiliates.map((affiliate) => [affiliate.id, affiliate]));

  return affiliates.map((affiliate) => {
    const ownReferrals = referrals.filter((referral) => referral.affiliate_id === affiliate.id);
    const directMembers = affiliates.filter((member) => member.sponsor_id === affiliate.id);
    const directMemberIds = new Set(directMembers.map((member) => member.id));
    const networkReferrals = referrals.filter((referral) => directMemberIds.has(referral.affiliate_id));
    const pending = ownReferrals.filter(
      (referral) => getReferralStatus({ ...referral, holdDays: settings.hold_days }) === "pending"
    );
    const hold = ownReferrals.filter(
      (referral) => getReferralStatus({ ...referral, holdDays: settings.hold_days }) === "paid"
    );
    const eligible = ownReferrals.filter(
      (referral) => getReferralStatus({ ...referral, holdDays: settings.hold_days }) === "eligible"
    );
    const networkEligible = networkReferrals.filter(
      (referral) => getReferralStatus({ ...referral, holdDays: settings.hold_days }) === "eligible"
    );
    const paid = ownReferrals.filter((referral) => referral.paid_at && !referral.refunded_at && !referral.cancelled_at);
    const blocked = ownReferrals.filter(
      (referral) => getReferralStatus({ ...referral, holdDays: settings.hold_days }) === "blocked"
    );
    const ownWithdrawals = withdrawals.filter(
      (withdrawal) => withdrawal.affiliate_id === affiliate.id && withdrawal.status !== "cancelled"
    );
    const withdrawn = ownWithdrawals.reduce((sum, withdrawal) => sum + withdrawal.amount_cents, 0);
    const directCommission = eligible.reduce((sum, referral) => sum + referral.commission_cents, 0);
    const networkBonus = networkEligible.reduce(
      (sum, referral) => sum + Math.round((referral.commission_cents * settings.network_bonus_percent) / 100),
      0
    );
    const commission = directCommission + networkBonus;
    const monthlyEligible = eligible.filter((referral) => referral.paid_at && referral.paid_at >= windowStart);
    const clickStats = clickRows.find((row) => row.affiliate_id === affiliate.id);
    const sponsor = affiliate.sponsor_id ? affiliateById.get(affiliate.sponsor_id) : null;

    return {
      ...affiliate,
      sponsor_name: sponsor?.name ?? null,
      total_referrals: ownReferrals.length,
      pending_referrals: pending.length,
      hold_referrals: hold.length,
      paid_referrals: paid.length,
      eligible_referrals: eligible.length,
      blocked_referrals: blocked.length,
      pending_sales_cents: pending.reduce((sum, referral) => sum + referral.subscription_value_cents, 0),
      hold_sales_cents: hold.reduce((sum, referral) => sum + referral.subscription_value_cents, 0),
      eligible_sales_cents: eligible.reduce((sum, referral) => sum + referral.subscription_value_cents, 0),
      gross_sales_cents: paid.reduce((sum, referral) => sum + referral.subscription_value_cents, 0),
      commission_earned_cents: commission,
      direct_commission_cents: directCommission,
      network_bonus_cents: networkBonus,
      direct_member_count: directMembers.length,
      network_eligible_sales: networkEligible.length,
      withdrawn_cents: withdrawn,
      available_cents: Math.max(commission - withdrawn, 0),
      free_access_credits: Math.floor(monthlyEligible.length / settings.free_access_sales_target),
      click_count: clickStats?.click_count ?? 0,
      last_click_at: clickStats?.last_click_at ?? null,
    };
  });
}

export function getAffiliateBaseUrl() {
  const settings = getProgramSettings();
  return (settings.affiliate_public_base_url || defaultAffiliatePublicBaseUrl).replace(/\/$/, "");
}

export function getCopyShieldSignupUrl() {
  const settings = getProgramSettings();
  return settings.signup_target_url || defaultSignupTargetUrl;
}

export function getTradeShieldSignupUrl() {
  const settings = getProgramSettings();
  return settings.tradeshield_signup_url || defaultTradeShieldSignupUrl;
}

export function getDashboardData() {
  const settings = getProgramSettings();
  const affiliates = getAffiliateSummaries();
  const referrals = getReferrals();
  const withdrawals = getWithdrawals();
  const paymentIntegrations = getPaymentIntegrations();
  const paymentOrders = getPaymentOrders();
  const digitalWallets = getDigitalWallets();
  const strategyFlow = getActiveStrategyFlow();

  const paidReferrals = referrals.filter((referral) => referral.paid_at && !referral.refunded_at && !referral.cancelled_at);
  const holdReferrals = referrals.filter((referral) => getReferralStatus({ ...referral, holdDays: settings.hold_days }) === "paid");
  const eligibleReferrals = referrals.filter(
    (referral) => getReferralStatus({ ...referral, holdDays: settings.hold_days }) === "eligible"
  );
  const blockedReferrals = referrals.filter(
    (referral) => getReferralStatus({ ...referral, holdDays: settings.hold_days }) === "blocked"
  );

  const stats = {
    affiliates: affiliates.length,
    confirmedSales: paidReferrals.length,
    holdSales: holdReferrals.length,
    eligibleSales: eligibleReferrals.length,
    blockedSales: blockedReferrals.length,
    grossSalesCents: paidReferrals.reduce((sum, referral) => sum + referral.subscription_value_cents, 0),
    availableCommissionCents: affiliates.reduce((sum, affiliate) => sum + affiliate.available_cents, 0),
    networkBonusCents: affiliates.reduce((sum, affiliate) => sum + affiliate.network_bonus_cents, 0),
    freeAccessCredits: affiliates.reduce((sum, affiliate) => sum + affiliate.free_access_credits, 0),
    pendingWithdrawalsCents: withdrawals
      .filter((withdrawal) => withdrawal.status === "requested")
      .reduce((sum, withdrawal) => sum + withdrawal.amount_cents, 0),
    accessRuleLabel: `${settings.free_access_sales_target} vendas elegiveis a cada ${settings.free_access_window_days} dias`,
    activePaymentIntegrations: paymentIntegrations.filter((integration) => integration.status === "active").length,
    activeDigitalWallets: digitalWallets.filter((wallet) => wallet.status === "active").length,
    activePlatformWallets: digitalWallets.filter((wallet) => wallet.status === "active" && wallet.owner_type === "platform").length,
  };

  return {
    affiliates,
    referrals,
    withdrawals,
    paymentIntegrations,
    paymentOrders,
    digitalWallets,
    strategyFlow,
    settings,
    stats,
    today: isoDate(),
  };
}

export function getAffiliatePortalData(affiliateId: number) {
  const settings = getProgramSettings();
  const affiliateSummaries = getAffiliateSummaries();
  const affiliate = affiliateSummaries.find((item) => item.id === affiliateId);
  if (!affiliate) return null;

  const referrals = getReferrals().filter((referral) => referral.affiliate_id === affiliateId);
  const withdrawals = getWithdrawals().filter((withdrawal) => withdrawal.affiliate_id === affiliateId);
  const digitalWallets = getDigitalWallets().filter(
    (wallet) => wallet.owner_type === "affiliate" && wallet.affiliate_id === affiliateId
  );
  const networkMembers = affiliateSummaries
    .filter((member) => member.sponsor_id === affiliateId)
    .map((member) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      phone: member.phone,
      code: member.code,
      status: member.status,
      created_at: member.created_at,
      paid_referrals: member.paid_referrals,
      eligible_referrals: member.eligible_referrals,
      network_bonus_cents: Math.round((member.direct_commission_cents * settings.network_bonus_percent) / 100),
    })) satisfies NetworkMemberRow[];
  const clicks = sqlite
    .prepare(
      `SELECT id, click_uid, affiliate_code, source_url, target_url, clicked_at
       FROM affiliate_clicks
       WHERE affiliate_id = ?
       ORDER BY clicked_at DESC
       LIMIT 20`
    )
    .all(affiliateId) as Array<{
    id: number;
    click_uid: string | null;
    affiliate_code: string;
    source_url: string | null;
    target_url: string;
    clicked_at: string;
  }>;

  const holdReferrals = referrals.filter((referral) => getReferralStatus({ ...referral, holdDays: settings.hold_days }) === "paid");
  const eligibleReferrals = referrals.filter(
    (referral) => getReferralStatus({ ...referral, holdDays: settings.hold_days }) === "eligible"
  );

  return {
    affiliate,
    referrals,
    withdrawals,
    digitalWallets,
    networkMembers,
    clicks,
    settings,
    stats: {
      totalClicks: affiliate.click_count,
      paidSales: affiliate.paid_referrals,
      holdSales: holdReferrals.length,
      eligibleSales: eligibleReferrals.length,
      grossSalesCents: affiliate.gross_sales_cents,
      availableCents: affiliate.available_cents,
      directCommissionCents: affiliate.direct_commission_cents,
      networkBonusCents: affiliate.network_bonus_cents,
      directMembers: networkMembers.length,
      networkEligibleSales: affiliate.network_eligible_sales,
      withdrawnCents: affiliate.withdrawn_cents,
      freeAccessCredits: affiliate.free_access_credits,
    },
  };
}
