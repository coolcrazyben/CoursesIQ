-- Add section_number to alerts for section-specific tracking
ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS section_number text;
