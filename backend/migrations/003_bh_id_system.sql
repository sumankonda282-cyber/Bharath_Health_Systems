-- BH ID System Migration
-- Run this in your Supabase SQL editor

-- 1. Alter patient_users: remove unique on mobile, make password optional, add OTP fields
ALTER TABLE patient_users ALTER COLUMN mobile DROP NOT NULL;
ALTER TABLE patient_users ALTER COLUMN hashed_password DROP NOT NULL;
ALTER TABLE patient_users ALTER COLUMN full_name DROP NOT NULL;
ALTER TABLE patient_users ALTER COLUMN full_name SET DEFAULT '';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'patient_users_mobile_key'
  ) THEN
    ALTER TABLE patient_users DROP CONSTRAINT patient_users_mobile_key;
  END IF;
END $$;

ALTER TABLE patient_users ADD COLUMN IF NOT EXISTS otp_code VARCHAR(10);
ALTER TABLE patient_users ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMP;
ALTER TABLE patient_users ADD COLUMN IF NOT EXISTS otp_verified_token VARCHAR(255);
ALTER TABLE patient_users ADD COLUMN IF NOT EXISTS otp_token_expiry TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_patient_users_mobile ON patient_users(mobile);

-- 2. BH State Groups table (digit → group of states)
CREATE TABLE IF NOT EXISTS bh_state_groups (
    id     SERIAL PRIMARY KEY,
    digit  INTEGER UNIQUE NOT NULL CHECK (digit >= 0 AND digit <= 9),
    label  VARCHAR(100) NOT NULL,
    states JSONB NOT NULL DEFAULT '[]'
);

-- 3. BH ID Sequences (atomic counters per digit)
CREATE TABLE IF NOT EXISTS bh_id_sequences (
    id       SERIAL PRIMARY KEY,
    digit    INTEGER UNIQUE NOT NULL REFERENCES bh_state_groups(digit),
    next_seq INTEGER NOT NULL DEFAULT 1
);

-- 4. BH Profiles (permanent health identity per person)
CREATE TABLE IF NOT EXISTS bh_profiles (
    id              SERIAL PRIMARY KEY,
    patient_user_id INTEGER NOT NULL REFERENCES patient_users(id),
    bh_id           VARCHAR(11) UNIQUE NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    gender          VARCHAR(10),
    date_of_birth   DATE,
    state           VARCHAR(100),
    state_digit     INTEGER NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bh_profiles_bh_id ON bh_profiles(bh_id);
CREATE INDEX IF NOT EXISTS idx_bh_profiles_patient_user_id ON bh_profiles(patient_user_id);

-- 5. Add mci_verified to doctor_profiles
ALTER TABLE doctor_profiles ADD COLUMN IF NOT EXISTS mci_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- 6. Add telehealth_joined_at to appointments (if not already present)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS telehealth_joined_at TIMESTAMP;

-- 7. Seed BH State Groups (digit 0-9 for Indian states/UTs)
INSERT INTO bh_state_groups (digit, label, states) VALUES
(0, 'North India (Mountains)',
 '["Jammu and Kashmir", "Ladakh", "Himachal Pradesh", "Uttarakhand", "Jammu & Kashmir"]'),
(1, 'North India (Plains)',
 '["Punjab", "Haryana", "Delhi", "Chandigarh", "New Delhi"]'),
(2, 'Uttar Pradesh',
 '["Uttar Pradesh", "UP"]'),
(3, 'Central India',
 '["Rajasthan", "Madhya Pradesh", "Chhattisgarh", "MP"]'),
(4, 'East India',
 '["Bihar", "Jharkhand"]'),
(5, 'East India (Coast)',
 '["West Bengal", "Odisha", "Sikkim", "WB"]'),
(6, 'Northeast India',
 '["Assam", "Meghalaya", "Manipur", "Mizoram", "Nagaland", "Tripura", "Arunachal Pradesh",
   "Andaman and Nicobar Islands", "Andaman & Nicobar Islands"]'),
(7, 'West India',
 '["Maharashtra", "Goa"]'),
(8, 'West India (Northwest)',
 '["Gujarat", "Dadra and Nagar Haveli", "Daman and Diu", "Dadra & Nagar Haveli", "Daman & Diu"]'),
(9, 'South India',
 '["Karnataka", "Kerala", "Tamil Nadu", "Andhra Pradesh", "Telangana",
   "Puducherry", "Pondicherry", "Lakshadweep", "TN", "AP"]')
ON CONFLICT (digit) DO NOTHING;

-- 8. Seed sequences (start at 1 for each digit)
INSERT INTO bh_id_sequences (digit, next_seq)
SELECT digit, 1 FROM bh_state_groups
ON CONFLICT (digit) DO NOTHING;
