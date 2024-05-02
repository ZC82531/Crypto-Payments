-- Enhanced Business Profiles table with security features
-- This script is idempotent and safe to run multiple times

-- Create the main business profiles table
CREATE TABLE IF NOT EXISTS business_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name VARCHAR(100) NOT NULL,
    
    -- Legacy fields (for backward compatibility)
    routing_number VARCHAR(9),
    account_number VARCHAR(20),
    
    -- New tokenized fields for enhanced security
    routing_number_token TEXT,
    account_number_token TEXT,
    routing_hash JSONB,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Security metadata
    encryption_version INTEGER DEFAULT 1,
    
    -- Constraints
    CONSTRAINT unique_user_business UNIQUE(user_id),
    CONSTRAINT valid_business_name CHECK (LENGTH(business_name) >= 2)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id ON business_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_business_profiles_updated_at ON business_profiles(updated_at);

-- Enable Row Level Security
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can view their own business profile" ON business_profiles;
DROP POLICY IF EXISTS "Users can insert their own business profile" ON business_profiles;
DROP POLICY IF EXISTS "Users can update their own business profile" ON business_profiles;
DROP POLICY IF EXISTS "Users can delete their own business profile" ON business_profiles;

-- Create RLS policies
CREATE POLICY "Users can view their own business profile" 
ON business_profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own business profile" 
ON business_profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business profile" 
ON business_profiles FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own business profile" 
ON business_profiles FOR DELETE 
USING (auth.uid() = user_id);

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Update trigger
DROP TRIGGER IF EXISTS update_business_profiles_updated_at ON business_profiles;
CREATE TRIGGER update_business_profiles_updated_at
    BEFORE UPDATE ON business_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON business_profiles TO authenticated;

-- ============================================
-- Payments Table
-- ============================================

-- Create the payments table
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  merchant_user_id UUID NULL,
  merchant_email TEXT NULL,
  customer_email TEXT NULL,
  amount NUMERIC(10, 2) NULL,
  coinbase_charge_id TEXT NULL,
  status TEXT NULL DEFAULT 'pending'::TEXT,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  CONSTRAINT payments_pkey PRIMARY KEY (id)
);

-- Create index for faster queries by merchant
CREATE INDEX IF NOT EXISTS idx_payments_merchant 
ON public.payments USING btree (merchant_user_id);

-- Enable Row Level Security
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Merchants can view their own payments" ON public.payments;
DROP POLICY IF EXISTS "Anyone can create payments" ON public.payments;

-- Create RLS policies
-- Merchants can view their own payments
CREATE POLICY "Merchants can view their own payments" 
ON public.payments FOR SELECT 
USING (auth.uid() = merchant_user_id);

-- Allow anyone to create payment records (needed for customer-initiated payments)
CREATE POLICY "Anyone can create payments" 
ON public.payments FOR INSERT 
WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.payments TO authenticated;
GRANT ALL ON public.payments TO anon;