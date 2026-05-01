CREATE TABLE schedules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'My Schedule',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE schedule_courses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id uuid REFERENCES schedules(id) ON DELETE CASCADE,
  subject text NOT NULL,
  course_number text NOT NULL,
  professor text,
  notes text,
  added_at timestamptz DEFAULT now()
);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users own schedules" ON schedules
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "users own schedule_courses" ON schedule_courses
  FOR ALL USING (
    schedule_id IN (SELECT id FROM schedules WHERE user_id = auth.uid())
  );
