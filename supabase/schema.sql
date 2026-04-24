-- ApplyAI Database Schema
-- Run this in your Supabase SQL editor to set up the tables

-- Users / Profiles
create table if not exists profiles (
  id uuid references auth.users primary key,
  full_name text,
  headline text,
  location text,
  remote_only boolean default false,
  salary_min integer,
  salary_max integer,
  roles text[] default '{}',
  skills text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CV versions
create table if not exists cvs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,
  label text,
  content jsonb default '{}',
  pdf_url text,
  is_master boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Jobs discovered by the agent
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  external_id text,
  title text not null,
  company text not null,
  location text,
  remote boolean default false,
  salary_min integer,
  salary_max integer,
  description text,
  url text,
  match_score integer,
  matched_skills text[] default '{}',
  missing_skills text[] default '{}',
  discovered_at timestamptz default now(),
  unique(source, external_id)
);

-- Applications
create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,
  job_id uuid references jobs on delete cascade,
  cv_id uuid references cvs on delete set null,
  status text default 'applied'
    check (status in ('applied', 'viewed', 'screening', 'interview', 'offer', 'rejected')),
  applied_at timestamptz default now(),
  notes text,
  auto_applied boolean default false,
  updated_at timestamptz default now()
);

-- Indexes
create index if not exists idx_jobs_source on jobs(source);
create index if not exists idx_jobs_match_score on jobs(match_score desc);
create index if not exists idx_jobs_discovered_at on jobs(discovered_at desc);
create index if not exists idx_applications_user on applications(user_id);
create index if not exists idx_applications_status on applications(status);
create index if not exists idx_cvs_user on cvs(user_id);

-- RLS policies (enable row-level security)
alter table profiles enable row level security;
alter table cvs enable row level security;
alter table applications enable row level security;

-- Profiles: users can read/update their own
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- CVs: users can CRUD their own
create policy "Users can view own CVs" on cvs
  for select using (auth.uid() = user_id);
create policy "Users can insert own CVs" on cvs
  for insert with check (auth.uid() = user_id);
create policy "Users can update own CVs" on cvs
  for update using (auth.uid() = user_id);
create policy "Users can delete own CVs" on cvs
  for delete using (auth.uid() = user_id);

-- Jobs: readable by all authenticated users
create policy "Authenticated users can view jobs" on jobs
  for select using (auth.role() = 'authenticated');

-- Applications: users can CRUD their own
create policy "Users can view own applications" on applications
  for select using (auth.uid() = user_id);
create policy "Users can insert own applications" on applications
  for insert with check (auth.uid() = user_id);
create policy "Users can update own applications" on applications
  for update using (auth.uid() = user_id);
