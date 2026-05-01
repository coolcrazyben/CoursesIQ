-- Migration 008: waitlist position tracking + pending courses

-- Add waitlist position fields to alerts
ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS waitlist_position integer,
  ADD COLUMN IF NOT EXISTS waitlist_total     integer;

-- Add pending flag to schedule_courses
ALTER TABLE public.schedule_courses
  ADD COLUMN IF NOT EXISTS is_pending boolean NOT NULL DEFAULT false;
