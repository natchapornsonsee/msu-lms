-- MSU Future Learning V0.1
-- Run in Supabase SQL Editor on a fresh project.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role text not null default 'student' check (role in ('student','external','admin')),
  first_name text not null default '',
  last_name text not null default '',
  student_id text,
  faculty text,
  program text,
  year integer,
  group_name text,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text not null default '',
  passing_progress numeric(5,2) not null default 80,
  quiz_pass_score numeric(5,2) not null default 60,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_parts (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text not null default '',
  order_no integer not null default 1,
  video_provider text not null default 'youtube' check (video_provider in ('youtube')),
  video_ref text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(course_id, order_no)
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  reset_count integer not null default 0,
  enrolled_at timestamptz not null default now(),
  unique(user_id, course_id)
);

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  part_id uuid not null references public.course_parts(id) on delete cascade,
  attempt_no integer not null default 0,
  duration_seconds numeric(12,2) not null default 0,
  watched_ranges jsonb not null default '[]'::jsonb,
  progress_pct numeric(5,2) not null default 0,
  passed boolean not null default false,
  passed_at timestamptz,
  last_position_seconds numeric(12,2) not null default 0,
  updated_at timestamptz not null default now(),
  unique(user_id, part_id, attempt_no)
);

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option text not null check (correct_option in ('A','B','C','D')),
  order_no integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  attempt_no integer not null default 0,
  status text not null default 'in_progress' check (status in ('in_progress','submitted')),
  question_snapshot jsonb not null default '[]'::jsonb,
  answers jsonb not null default '{}'::jsonb,
  score numeric(5,2),
  total_questions integer,
  correct_answers integer,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  unique(user_id, course_id, attempt_no)
);

create table if not exists public.reset_audit (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id),
  user_id uuid references public.profiles(id),
  course_id uuid not null references public.courses(id),
  previous_attempt_no integer not null,
  new_attempt_no integer not null,
  scope text not null check (scope in ('user','all')),
  created_at timestamptz not null default now()
);

create index if not exists idx_parts_course on public.course_parts(course_id, order_no);
create index if not exists idx_enroll_user on public.enrollments(user_id);
create index if not exists idx_progress_user_part on public.lesson_progress(user_id, part_id, attempt_no);
create index if not exists idx_quiz_attempt_user_course on public.quiz_attempts(user_id, course_id, attempt_no);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_parts enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.reset_audit enable row level security;

-- Profiles
create policy "profiles own select" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles admin update" on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "profiles admin insert" on public.profiles for insert to authenticated with check (public.is_admin());

-- Courses / parts: learners see only published courses they are enrolled in; admins see all.
create or replace function public.is_enrolled(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.enrollments e where e.user_id = auth.uid() and e.course_id = p_course_id);
$$;

create policy "courses read" on public.courses for select to authenticated using (public.is_admin() or (is_published and public.is_enrolled(id)));
create policy "courses admin write" on public.courses for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "parts read" on public.course_parts for select to authenticated using (
  public.is_admin() or exists(select 1 from public.courses c where c.id = course_id and c.is_published and public.is_enrolled(c.id))
);
create policy "parts admin write" on public.course_parts for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Enrollment
create policy "enrollment read" on public.enrollments for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "enrollment admin write" on public.enrollments for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Progress: learners can read their own rows. Writes go through server API only.
create policy "progress read" on public.lesson_progress for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "progress admin write" on public.lesson_progress for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Correct answers are intentionally not readable by students. Quiz API uses server-side service role.
create policy "questions admin only" on public.quiz_questions for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "attempt read own" on public.quiz_attempts for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "attempt admin read" on public.quiz_attempts for select to authenticated using (public.is_admin());
create policy "reset admin read" on public.reset_audit for select to authenticated using (public.is_admin());

-- Optional helper: update updated_at manually in app for V0.1.
