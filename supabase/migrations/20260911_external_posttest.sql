-- MSU LMS V0.1.9 - External Post-Test link
-- Safe to run more than once.
alter table public.courses
add column if not exists post_test_url text;
