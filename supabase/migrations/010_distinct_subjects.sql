-- Returns the sorted list of distinct subject codes from grade_distributions.
-- Used by the course filter to bypass PostgREST's max-rows cap.
create or replace function get_distinct_subjects()
returns table(subject text)
language sql
security definer
as $$
  select distinct subject from grade_distributions order by subject;
$$;
