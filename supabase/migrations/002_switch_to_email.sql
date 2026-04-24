-- Migration: Switch notification channel from SMS (Twilio) to Email (Resend)
-- Run in: Supabase Dashboard > SQL Editor > New Query > Run
-- Purpose:
--   1. Drop old unique constraint on (crn, phone_number)
--   2. Rename SMS-specific columns to channel-agnostic names
--   3. Make email NOT NULL, phone_number nullable
--   4. Add new unique constraint on (crn, email)

-- Step 1: Drop old unique constraint
ALTER TABLE public.alerts
  DROP CONSTRAINT IF EXISTS alerts_crn_phone_unique;

-- Step 2: Rename columns to channel-agnostic names
ALTER TABLE public.alerts
  RENAME COLUMN sms_sent_at TO sent_at;

ALTER TABLE public.alerts
  RENAME COLUMN sms_opted_out TO opted_out;

ALTER TABLE public.alerts
  RENAME COLUMN sms_sid TO message_id;

-- Step 3: Flip nullability — email required, phone optional
ALTER TABLE public.alerts
  ALTER COLUMN email SET NOT NULL;

ALTER TABLE public.alerts
  ALTER COLUMN phone_number DROP NOT NULL;

-- Step 4: Add unique constraint on (crn, email)
ALTER TABLE public.alerts
  ADD CONSTRAINT alerts_crn_email_unique UNIQUE (crn, email);
