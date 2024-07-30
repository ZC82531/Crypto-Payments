-- Widen routing_number and account_number columns to TEXT
-- because encrypted AES values are far longer than VARCHAR(20)/VARCHAR(50)

ALTER TABLE public.business_profiles
  ALTER COLUMN routing_number TYPE TEXT,
  ALTER COLUMN account_number TYPE TEXT;
