-- BetterPay core schema (PostgreSQL)
-- Applied by: betterpay push / MigrationRunner

CREATE TABLE IF NOT EXISTS betterpay_customer (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS betterpay_customer_email_idx ON betterpay_customer (email);

CREATE TABLE IF NOT EXISTS betterpay_product (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  name TEXT NOT NULL,
  group_id TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  price_amount BIGINT,
  price_currency TEXT,
  price_interval TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  hash TEXT NOT NULL,
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS betterpay_product_plan_version_idx ON betterpay_product (plan_id, version);
CREATE INDEX IF NOT EXISTS betterpay_product_group_idx ON betterpay_product (group_id);

CREATE TABLE IF NOT EXISTS betterpay_feature (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS betterpay_product_feature (
  product_id TEXT NOT NULL REFERENCES betterpay_product (id),
  feature_id TEXT NOT NULL REFERENCES betterpay_feature (id),
  metered_limit INTEGER,
  metered_reset TEXT
);

CREATE TABLE IF NOT EXISTS betterpay_subscription (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES betterpay_customer (id),
  plan_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  current_period_start_at TIMESTAMPTZ,
  current_period_end_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS betterpay_subscription_customer_group_idx ON betterpay_subscription (customer_id, group_id);
CREATE INDEX IF NOT EXISTS betterpay_subscription_status_idx ON betterpay_subscription (status);

CREATE TABLE IF NOT EXISTS betterpay_entitlement (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES betterpay_customer (id),
  feature_id TEXT NOT NULL,
  subscription_id TEXT NOT NULL REFERENCES betterpay_subscription (id),
  "limit" INTEGER,
  used INTEGER NOT NULL DEFAULT 0,
  next_reset_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS betterpay_entitlement_customer_feature_idx ON betterpay_entitlement (customer_id, feature_id);
CREATE INDEX IF NOT EXISTS betterpay_entitlement_subscription_idx ON betterpay_entitlement (subscription_id);

CREATE TABLE IF NOT EXISTS betterpay_invoice (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES betterpay_customer (id),
  subscription_id TEXT NOT NULL REFERENCES betterpay_subscription (id),
  plan_id TEXT NOT NULL,
  amount BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IDR',
  status TEXT NOT NULL DEFAULT 'draft',
  due_at TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS betterpay_invoice_customer_idx ON betterpay_invoice (customer_id);
CREATE INDEX IF NOT EXISTS betterpay_invoice_subscription_idx ON betterpay_invoice (subscription_id);
CREATE INDEX IF NOT EXISTS betterpay_invoice_status_due_idx ON betterpay_invoice (status, due_at);

CREATE TABLE IF NOT EXISTS payment_transaction (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  amount BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IDR',
  customer_email TEXT NOT NULL,
  metadata JSONB,
  provider_transaction_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_transaction_order_id_idx ON payment_transaction (order_id);
CREATE INDEX IF NOT EXISTS payment_transaction_provider_idx ON payment_transaction (provider_id);
CREATE INDEX IF NOT EXISTS payment_transaction_status_idx ON payment_transaction (status);

CREATE TABLE IF NOT EXISTS payment_event (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES payment_transaction (id),
  seq INTEGER NOT NULL,
  type TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS payment_event_transaction_idx ON payment_event (transaction_id);

CREATE TABLE IF NOT EXISTS payment_webhook_event (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  provider_event_id TEXT,
  event_name TEXT,
  payload JSONB,
  signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_webhook_event_provider_event_idx
  ON payment_webhook_event (provider_id, provider_event_id);

CREATE TABLE IF NOT EXISTS payment_idempotency_key (
  key TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_gateway_config (
  id TEXT PRIMARY KEY,
  provider_id TEXT NOT NULL,
  credentials JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS payment_gateway_config_provider_idx ON payment_gateway_config (provider_id);
