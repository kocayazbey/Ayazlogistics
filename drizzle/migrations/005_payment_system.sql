-- Payment System Migration
-- Created: 2025-10-27
-- Description: Payment processing with 3D Secure support

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Payment status enum
CREATE TYPE payment_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
  'refunded',
  'partially_refunded'
);

-- Payment method enum
CREATE TYPE payment_method AS ENUM (
  'credit_card',
  'debit_card',
  'bank_transfer',
  'cash',
  'check'
);

-- Currency enum
CREATE TYPE currency AS ENUM (
  'TRY',
  'USD',
  'EUR',
  'GBP'
);

-- =============================================
-- PAYMENT TABLES
-- =============================================

-- Payment transactions table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Payment identifiers
  payment_id VARCHAR(100) NOT NULL UNIQUE,
  order_id VARCHAR(100) NOT NULL,

  -- Payment details
  amount DECIMAL(15, 2) NOT NULL,
  currency currency NOT NULL DEFAULT 'TRY',
  payment_method payment_method NOT NULL,

  -- Status and timestamps
  status payment_status NOT NULL DEFAULT 'pending',
  status_message TEXT,
  processed_at TIMESTAMP,
  completed_at TIMESTAMP,
  refunded_at TIMESTAMP,

  -- 3D Secure details
  three_d_secure_id VARCHAR(100),
  authentication_id VARCHAR(100),
  cavv VARCHAR(100),
  eci VARCHAR(10),
  xid VARCHAR(100),

  -- Bank details
  bank_reference VARCHAR(100),
  transaction_id VARCHAR(100),
  auth_code VARCHAR(50),

  -- Refund details
  refund_amount DECIMAL(15, 2),
  refund_reason TEXT,
  original_payment_id UUID REFERENCES payments(id),

  -- Customer and billing info
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  billing_address JSONB,

  -- Security and compliance
  ip_address VARCHAR(45),
  user_agent TEXT,
  risk_score DECIMAL(5, 2),

  -- Metadata
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Payment logs for audit trail
CREATE TABLE IF NOT EXISTS payment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,

  action VARCHAR(50) NOT NULL, -- initiated, verified, completed, failed, refunded
  old_status payment_status,
  new_status payment_status,

  amount DECIMAL(15, 2),
  currency currency,

  user_id UUID REFERENCES users(id),
  description TEXT,

  -- Technical details
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,

  ip_address VARCHAR(45),
  user_agent TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Payment gateway configurations
CREATE TABLE IF NOT EXISTS payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  gateway_name VARCHAR(100) NOT NULL,
  gateway_type VARCHAR(50) NOT NULL, -- bank, psp, wallet

  -- API credentials (encrypted in production)
  api_key TEXT NOT NULL,
  api_secret TEXT NOT NULL,
  merchant_id VARCHAR(100),
  webhook_secret TEXT,

  -- Gateway settings
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_sandbox BOOLEAN NOT NULL DEFAULT FALSE,

  -- Supported features
  supports_3ds BOOLEAN NOT NULL DEFAULT TRUE,
  supports_refunds BOOLEAN NOT NULL DEFAULT TRUE,
  supports_installments BOOLEAN NOT NULL DEFAULT FALSE,

  -- Limits
  min_amount DECIMAL(15, 2),
  max_amount DECIMAL(15, 2),

  -- Webhook configuration
  webhook_url TEXT,
  webhook_events JSONB,

  metadata JSONB,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PAYMENT SYSTEM
-- =============================================

-- Payment table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_payment_id ON payments(payment_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_tenant_status ON payments(tenant_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_user_status ON payments(user_id, status, created_at DESC);

-- Payment logs indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_logs_payment_id ON payment_logs(payment_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_logs_user_id ON payment_logs(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_logs_action ON payment_logs(action);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_logs_created_at ON payment_logs(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_logs_tenant_action ON payment_logs(payment_id) WHERE payment_id IN (SELECT id FROM payments WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Payment gateways indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_gateways_tenant ON payment_gateways(tenant_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_gateways_active ON payment_gateways(is_active) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_gateways_type ON payment_gateways(gateway_type);

-- =============================================
-- CONSTRAINTS
-- =============================================

-- Ensure payment amounts are positive
ALTER TABLE payments ADD CONSTRAINT check_payment_amount_positive CHECK (amount > 0);
ALTER TABLE payments ADD CONSTRAINT check_refund_amount_positive CHECK (refund_amount IS NULL OR refund_amount > 0);

-- Ensure refund amount doesn't exceed original payment
ALTER TABLE payments ADD CONSTRAINT check_refund_not_exceed_payment
  CHECK (refund_amount IS NULL OR refund_amount <= amount);

-- Ensure completed_at is set when status is completed
ALTER TABLE payments ADD CONSTRAINT check_completed_at_when_completed
  CHECK (status != 'completed' OR completed_at IS NOT NULL);

-- Ensure processed_at is set when status is processing or completed
ALTER TABLE payments ADD CONSTRAINT check_processed_at_when_processing
  CHECK (status NOT IN ('processing', 'completed') OR processed_at IS NOT NULL);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_updated_at();

CREATE TRIGGER trigger_payment_gateways_updated_at
  BEFORE UPDATE ON payment_gateways
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_updated_at();

-- =============================================
-- RLS (Row Level Security) POLICIES
-- =============================================

-- Enable RLS on payment tables
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_gateways ENABLE ROW LEVEL SECURITY;

-- Payment access policies (tenant-based isolation)
CREATE POLICY payments_tenant_isolation ON payments
  FOR ALL USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

CREATE POLICY payment_logs_tenant_isolation ON payment_logs
  FOR ALL USING (
    payment_id IN (SELECT id FROM payments WHERE tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  );

CREATE POLICY payment_gateways_tenant_isolation ON payment_gateways
  FOR ALL USING (
    tenant_id = current_setting('app.current_tenant_id', true)::uuid
  );

-- =============================================
-- INITIAL DATA
-- =============================================

-- Insert default payment gateway configuration
INSERT INTO payment_gateways (
  tenant_id,
  gateway_name,
  gateway_type,
  api_key,
  api_secret,
  merchant_id,
  is_active,
  is_sandbox,
  supports_3ds,
  supports_refunds,
  min_amount,
  max_amount,
  webhook_events
) VALUES (
  (SELECT id FROM tenants WHERE slug = 'default' LIMIT 1),
  'Bank API Gateway',
  'bank',
  'test_api_key_placeholder',
  'test_api_secret_placeholder',
  'test_merchant_id',
  true,
  true,
  true,
  true,
  1.00,
  100000.00,
  '["payment.completed", "payment.failed", "payment.refunded"]'::jsonb
);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE payments IS 'Payment transactions with 3D Secure support';
COMMENT ON TABLE payment_logs IS 'Audit trail for all payment operations';
COMMENT ON TABLE payment_gateways IS 'Payment gateway configurations per tenant';

COMMENT ON COLUMN payments.payment_id IS 'Unique payment identifier for external systems';
COMMENT ON COLUMN payments.three_d_secure_id IS '3D Secure authentication session ID';
COMMENT ON COLUMN payments.cavv IS 'Cardholder Authentication Verification Value from 3D Secure';
COMMENT ON COLUMN payments.eci IS 'Electronic Commerce Indicator from 3D Secure';
COMMENT ON COLUMN payments.xid IS 'Transaction ID from 3D Secure process';

COMMENT ON COLUMN payment_logs.request_data IS 'Original request data for audit';
COMMENT ON COLUMN payment_logs.response_data IS 'Bank/payment gateway response data';
COMMENT ON COLUMN payment_logs.error_message IS 'Error details for failed operations';

-- =============================================
-- PERFORMANCE MONITORING
-- =============================================

-- Create view for payment analytics
CREATE VIEW payment_analytics AS
SELECT
  tenant_id,
  status,
  payment_method,
  currency,
  COUNT(*) as payment_count,
  SUM(amount) as total_amount,
  AVG(amount) as avg_amount,
  MIN(amount) as min_amount,
  MAX(amount) as max_amount,
  DATE_TRUNC('day', created_at) as payment_date
FROM payments
GROUP BY tenant_id, status, payment_method, currency, DATE_TRUNC('day', created_at);

-- Create view for payment success rates
CREATE VIEW payment_success_rates AS
SELECT
  tenant_id,
  payment_method,
  currency,
  COUNT(*) as total_payments,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_payments,
  ROUND(
    (COUNT(CASE WHEN status = 'completed' THEN 1 END)::decimal / COUNT(*)::decimal) * 100,
    2
  ) as success_rate
FROM payments
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY tenant_id, payment_method, currency;

-- =============================================
-- MIGRATION METADATA
-- =============================================

COMMENT ON INDEX idx_payments_tenant_id IS 'Critical for tenant-based payment isolation';
COMMENT ON INDEX idx_payments_payment_id IS 'Essential for payment lookup by external ID';
COMMENT ON INDEX idx_payments_status IS 'Core for payment status filtering and reporting';
COMMENT ON INDEX idx_payment_logs_created_at IS 'High-frequency audit log queries';

-- Performance statistics for payment indexes
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename IN ('payments', 'payment_logs', 'payment_gateways')
ORDER BY idx_scan DESC;
