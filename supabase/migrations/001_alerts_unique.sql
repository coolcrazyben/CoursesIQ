-- Migration: Add unique constraint on (crn, phone_number) in alerts table
-- Run in: Supabase Dashboard > SQL Editor > New Query > Run
-- Purpose: Enables race-condition-safe duplicate detection for ALRT-03
--   App-level SELECT check in POST /api/alerts is defense-in-depth;
--   this constraint is the authoritative gate that handles concurrent inserts.
-- Error code on violation: PostgreSQL 23505 (unique_violation)

ALTER TABLE public.alerts
  ADD CONSTRAINT alerts_crn_phone_unique UNIQUE (crn, phone_number);
