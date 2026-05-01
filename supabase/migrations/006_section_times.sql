ALTER TABLE schedule_courses ADD COLUMN IF NOT EXISTS crn text;
ALTER TABLE schedule_courses ADD COLUMN IF NOT EXISTS meeting_times jsonb;
