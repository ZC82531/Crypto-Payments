-- =============================================================================
-- CRYPTO PAYMENTS - Initial Schema Migration
-- =============================================================================
-- Run this against your new Supabase project to set up all required tables,
-- indexes, RLS policies, and triggers.
-- =============================================================================

-- ============================================================
-- 1. BUSINESS PROFILES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.business_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name       VARCHAR(100) NOT NULL,

    -- Legacy plain-text fields (kept for backward compatibility)
    routing_number      VARCHAR(20),
    account_number      VARCHAR(50),

    -- Tokenised / encrypted fields for enhanced security
    routing_number_token TEXT,
    account_number_token TEXT,
    routing_hash         JSONB,

    -- Security metadata
    encryption_version   INTEGER DEFAULT 1,

    -- Timestamps
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_user_business UNIQUE (user_id),
    CONSTRAINT valid_business_name  CHECK (LENGTH(TRIM(business_name)) >= 2)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id
    ON public.business_profiles (user_id);

CREATE INDEX IF NOT EXISTS idx_business_profiles_updated_at
    ON public.business_profiles (updated_at);

-- Enable Row Level Security
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop first so this is idempotent)
DROP POLICY IF EXISTS "Users can view their own business profile"   ON public.business_profiles;
DROP POLICY IF EXISTS "Users can insert their own business profile" ON public.business_profiles;
DROP POLICY IF EXISTS "Users can update their own business profile" ON public.business_profiles;
DROP POLICY IF EXISTS "Users can delete their own business profile" ON public.business_profiles;

CREATE POLICY "Users can view their own business profile"
    ON public.business_profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own business profile"
    ON public.business_profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business profile"
    ON public.business_profiles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own business profile"
    ON public.business_profiles FOR DELETE
    USING (auth.uid() = user_id);

-- Grants
GRANT USAGE  ON SCHEMA public                  TO authenticated;
GRANT ALL    ON public.business_profiles       TO authenticated;

-- ============================================================
-- 2. AUTO-UPDATE TIMESTAMP FUNCTION & TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_business_profiles_updated_at
    ON public.business_profiles;

CREATE TRIGGER update_business_profiles_updated_at
    BEFORE UPDATE ON public.business_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. PAYMENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payments (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    merchant_user_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    merchant_email      TEXT,
    customer_email      TEXT,
    amount              NUMERIC(10, 2),
    coinbase_charge_id  TEXT,
    status              TEXT        DEFAULT 'pending',
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_merchant_user_id
    ON public.payments (merchant_user_id);

CREATE INDEX IF NOT EXISTS idx_payments_coinbase_charge_id
    ON public.payments (coinbase_charge_id);

CREATE INDEX IF NOT EXISTS idx_payments_status
    ON public.payments (status);

-- Enable Row Level Security
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Merchants can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Anyone can create payments"           ON public.payments;
DROP POLICY IF EXISTS "Service role can update payments"     ON public.payments;

-- Merchants can only see their own payments
CREATE POLICY "Merchants can view their own payments"
    ON public.payments FOR SELECT
    USING (auth.uid() = merchant_user_id);

-- Customers (unauthenticated) can create payment records
CREATE POLICY "Anyone can create payments"
    ON public.payments FOR INSERT
    WITH CHECK (true);

-- Grants
GRANT ALL ON public.payments TO authenticated;
GRANT ALL ON public.payments TO anon;
