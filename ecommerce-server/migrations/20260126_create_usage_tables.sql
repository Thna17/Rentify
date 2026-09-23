CREATE TABLE IF NOT EXISTS UsageEvents (
  id CHAR(36) PRIMARY KEY,
  websiteId CHAR(36) NOT NULL,
  eventType ENUM('ORDER_PAID','INVOICE_PAID','STORE_VIEW') NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  occurredAt DATETIME NOT NULL,
  pricePerUnit DECIMAL(10,4) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  metadata JSON,
  idempotencyKey VARCHAR(255) NOT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  UNIQUE KEY uniq_usage_idempotency (idempotencyKey),
  KEY idx_usage_website (websiteId),
  KEY idx_usage_type (eventType),
  KEY idx_usage_occurred (occurredAt)
);

CREATE TABLE IF NOT EXISTS PricingRules (
  id CHAR(36) PRIMARY KEY,
  eventType ENUM('ORDER_PAID','INVOICE_PAID','STORE_VIEW') NOT NULL,
  pricePerUnit DECIMAL(10,4) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  effectiveFrom DATE NOT NULL,
  effectiveTo DATE NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  KEY idx_pricing_event (eventType),
  KEY idx_pricing_effective (effectiveFrom)
);

CREATE TABLE IF NOT EXISTS BillingStatements (
  id CHAR(36) PRIMARY KEY,
  websiteId CHAR(36) NOT NULL,
  month VARCHAR(7) NOT NULL,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  totalAmount DECIMAL(10,2) NOT NULL DEFAULT 0,
  breakdown JSON,
  status ENUM('pending','paid') NOT NULL DEFAULT 'pending',
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  UNIQUE KEY uniq_billing_month (websiteId, month),
  KEY idx_billing_website (websiteId)
);

ALTER TABLE Payments
  ADD COLUMN IF NOT EXISTS paidAt DATETIME NULL;
