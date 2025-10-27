-- Initial Schema Migration
-- Created: 2025-01-27
-- Description: Complete initial database schema for AyazLogistics

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- =============================================
-- CORE TABLES
-- =============================================

-- Tenants table (multi-tenancy)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  settings JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =============================================
-- BILLING TABLES
-- =============================================

-- Billing contracts
CREATE TABLE IF NOT EXISTS billing_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contract_number VARCHAR(50) NOT NULL UNIQUE,
  customer_id UUID NOT NULL,
  contract_type VARCHAR(50),
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  billing_cycle VARCHAR(20),
  payment_terms VARCHAR(50),
  currency VARCHAR(10) DEFAULT 'TRY',
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Billing rates
CREATE TABLE IF NOT EXISTS billing_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES billing_contracts(id) ON DELETE CASCADE,
  rate_type VARCHAR(50) NOT NULL,
  rate_name VARCHAR(255) NOT NULL,
  unit_of_measure VARCHAR(50),
  rate_amount DECIMAL(12, 2) NOT NULL,
  minimum_charge DECIMAL(12, 2),
  currency VARCHAR(10) DEFAULT 'TRY',
  valid_from DATE NOT NULL,
  valid_until DATE,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Billing invoices
CREATE TABLE IF NOT EXISTS billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  contract_id UUID REFERENCES billing_contracts(id),
  customer_id UUID NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  subtotal DECIMAL(15, 2) NOT NULL,
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2) NOT NULL,
  paid_amount DECIMAL(15, 2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'TRY',
  status VARCHAR(20) DEFAULT 'draft',
  sent_at TIMESTAMP,
  paid_at TIMESTAMP,
  metadata JSONB,
  created_by UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Usage tracking
CREATE TABLE IF NOT EXISTS billing_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL,
  usage_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  quantity DECIMAL(12, 2) NOT NULL,
  unit_of_measure VARCHAR(50),
  rate_amount DECIMAL(12, 2),
  total_amount DECIMAL(12, 2),
  usage_date DATE NOT NULL,
  usage_start_time TIMESTAMP,
  usage_end_time TIMESTAMP,
  invoiced BOOLEAN DEFAULT FALSE,
  invoice_id UUID,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Seasonal pricing rules
CREATE TABLE IF NOT EXISTS seasonal_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rule_name VARCHAR(255) NOT NULL,
  season_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  applicable_service_types JSONB,
  adjustment_type VARCHAR(20) NOT NULL,
  adjustment_value DECIMAL(10, 2) NOT NULL,
  minimum_charge DECIMAL(12, 2),
  maximum_charge DECIMAL(12, 2),
  priority VARCHAR(10) DEFAULT 'medium',
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Exchange rates
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_currency VARCHAR(10) NOT NULL,
  to_currency VARCHAR(10) NOT NULL,
  rate DECIMAL(20, 10) NOT NULL,
  source VARCHAR(50) NOT NULL,
  effective_date DATE NOT NULL,
  metadata TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Billing contracts indexes
CREATE INDEX IF NOT EXISTS idx_billing_contracts_tenant ON billing_contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_contracts_customer ON billing_contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_billing_contracts_status ON billing_contracts(status);

-- Billing rates indexes
CREATE INDEX IF NOT EXISTS idx_billing_rates_contract ON billing_rates(contract_id);
CREATE INDEX IF NOT EXISTS idx_billing_rates_type ON billing_rates(rate_type);
CREATE INDEX IF NOT EXISTS idx_billing_rates_dates ON billing_rates(valid_from, valid_until);

-- Billing invoices indexes
CREATE INDEX IF NOT EXISTS idx_billing_invoices_tenant ON billing_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_customer ON billing_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_status ON billing_invoices(status);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_dates ON billing_invoices(invoice_date, due_date);

-- Usage tracking indexes
CREATE INDEX IF NOT EXISTS idx_usage_tracking_contract ON billing_usage_tracking(contract_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_date ON billing_usage_tracking(usage_date);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_invoiced ON billing_usage_tracking(invoiced);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_tenant ON billing_usage_tracking(tenant_id);

-- Seasonal pricing indexes
CREATE INDEX IF NOT EXISTS idx_seasonal_pricing_tenant ON seasonal_pricing_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_seasonal_pricing_dates ON seasonal_pricing_rules(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_seasonal_pricing_active ON seasonal_pricing_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_seasonal_pricing_season ON seasonal_pricing_rules(season_type);

-- Exchange rates indexes
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON exchange_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates(effective_date);
CREATE INDEX IF NOT EXISTS idx_exchange_rates_tenant ON exchange_rates(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_exchange_rates_unique ON exchange_rates(from_currency, to_currency, effective_date, tenant_id);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE tenants IS 'Multi-tenant organization table';
COMMENT ON TABLE users IS 'System users with authentication';
COMMENT ON TABLE billing_contracts IS 'Customer billing contracts and agreements';
COMMENT ON TABLE billing_rates IS 'Rate structures for billing contracts';
COMMENT ON TABLE billing_invoices IS 'Generated invoices for customers';
COMMENT ON TABLE billing_usage_tracking IS 'Tracks real-time usage for usage-based billing';
COMMENT ON TABLE seasonal_pricing_rules IS 'Peak season and dynamic pricing rules';
COMMENT ON TABLE exchange_rates IS 'Currency exchange rates for multi-currency billing';

COMMENT ON COLUMN billing_usage_tracking.usage_type IS 'Type of service: forklift_operator, rack_storage, handling, etc.';
COMMENT ON COLUMN billing_usage_tracking.invoiced IS 'Flag indicating if usage has been invoiced';
COMMENT ON COLUMN seasonal_pricing_rules.season_type IS 'Season type: peak_holiday, ramadan, black_friday, etc.';
COMMENT ON COLUMN seasonal_pricing_rules.adjustment_type IS 'Type: percentage or fixed_amount';
COMMENT ON COLUMN exchange_rates.source IS 'Source: TCMB, manual, fallback, etc.';
COMMENT ON COLUMN exchange_rates.rate IS 'Exchange rate with high precision (10 decimal places)';
