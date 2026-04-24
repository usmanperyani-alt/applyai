-- ApplyAI Database Schema
-- Run this in your Supabase SQL editor to set up the tables.
-- This file is idempotent — safe to re-run after column additions.

-- pgvector for semantic job matching (Phase 2)
create extension if not exists vector;

-- Users / Profiles
create table if not exists profiles (
  id uuid references auth.users primary key,
  full_name text,
  headline text,
  email text,
  phone text,
  linkedin_url text,
  location text,
  remote_only boolean default false,
  salary_min integer,
  salary_max integer,
  roles text[] default '{}',
  skills text[] default '{}',
  embedding vector(1024),
  gmail_refresh_token text,  -- encrypted Gmail OAuth token (Phase 5)
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
  tailored_for_job_id uuid,  -- FK added below; allows tailored CVs to point at the job they were built for
  embedding vector(1024),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Jobs discovered by the agent
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  external_id text,
  -- Stable hash for cross-source dedup (company + title + location, normalized)
  canonical_hash text unique,
  title text not null,
  company text not null,
  location text,
  remote boolean default false,
  salary_min integer,
  salary_max integer,
  description text,           -- sanitized HTML for rendering
  description_text text,      -- HTML-stripped plain text for matching/embedding
  url text,
  -- Multi-source tracking: when the same posting appears on Greenhouse + Indeed,
  -- the canonical row collects all sources/urls
  all_sources text[] default '{}',
  all_urls jsonb default '{}',
  match_score integer,
  matched_skills text[] default '{}',
  missing_skills text[] default '{}',
  embedding vector(1024),     -- Phase 2: semantic matching
  embedding_model text,        -- track which model produced the embedding
  llm_graded_at timestamptz,   -- when the LLM last scored this job
  discovered_at timestamptz default now(),
  unique(source, external_id)
);

-- Now that jobs exists, add the FK from cvs.tailored_for_job_id
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cvs_tailored_for_job_id_fkey'
  ) then
    alter table cvs
      add constraint cvs_tailored_for_job_id_fkey
      foreign key (tailored_for_job_id) references jobs(id) on delete set null;
  end if;
end $$;

-- Applications
create table if not exists applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,
  job_id uuid references jobs on delete cascade,
  cv_id uuid references cvs on delete set null,
  status text default 'applied'
    check (status in ('applied', 'viewed', 'screening', 'interview', 'offer', 'rejected', 'pending_verification')),
  applied_at timestamptz default now(),
  notes text,
  auto_applied boolean default false,
  submission_log jsonb default '{}',     -- ATS type, success indicator, screenshots, error trace
  status_history jsonb default '[]',     -- [{ status, changed_at, source: 'gmail'|'manual'|'webhook' }]
  updated_at timestamptz default now()
);

-- Indexes
create index if not exists idx_jobs_source on jobs(source);
create index if not exists idx_jobs_match_score on jobs(match_score desc);
create index if not exists idx_jobs_discovered_at on jobs(discovered_at desc);
create index if not exists idx_jobs_canonical_hash on jobs(canonical_hash);
create index if not exists idx_applications_user on applications(user_id);
create index if not exists idx_applications_status on applications(status);
create index if not exists idx_cvs_user on cvs(user_id);

-- Vector index for semantic search (Phase 2)
-- Use ivfflat with cosine distance; lists=100 is reasonable for <1M jobs
do $$
begin
  if not exists (
    select 1 from pg_indexes where indexname = 'idx_jobs_embedding'
  ) then
    create index idx_jobs_embedding on jobs using ivfflat (embedding vector_cosine_ops) with (lists = 100);
  end if;
end $$;

-- RLS policies (enable row-level security)
alter table profiles enable row level security;
alter table cvs enable row level security;
alter table applications enable row level security;
alter table jobs enable row level security;

-- Profiles: users can read/update their own
drop policy if exists "Users can view own profile" on profiles;
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);
drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- CVs: users can CRUD their own
drop policy if exists "Users can view own CVs" on cvs;
create policy "Users can view own CVs" on cvs
  for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own CVs" on cvs;
create policy "Users can insert own CVs" on cvs
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own CVs" on cvs;
create policy "Users can update own CVs" on cvs
  for update using (auth.uid() = user_id);
drop policy if exists "Users can delete own CVs" on cvs;
create policy "Users can delete own CVs" on cvs
  for delete using (auth.uid() = user_id);

-- Jobs: readable by everyone (jobs are shared across users)
drop policy if exists "Anyone can read jobs" on jobs;
create policy "Anyone can read jobs" on jobs
  for select using (true);

-- Applications: users can CRUD their own
drop policy if exists "Users can view own applications" on applications;
create policy "Users can view own applications" on applications
  for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own applications" on applications;
create policy "Users can insert own applications" on applications
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own applications" on applications;
create policy "Users can update own applications" on applications
  for update using (auth.uid() = user_id);

-- Semantic match RPC (Phase 2)
create or replace function match_jobs_by_embedding(
  profile_embedding vector(1024),
  match_threshold float,
  match_count int
) returns table (
  id uuid,
  similarity float,
  title text,
  company text,
  description text,
  description_text text,
  location text,
  remote boolean,
  url text,
  match_score integer
)
language sql stable
as $$
  select
    jobs.id,
    1 - (jobs.embedding <=> profile_embedding) as similarity,
    jobs.title, jobs.company, jobs.description, jobs.description_text,
    jobs.location, jobs.remote, jobs.url, jobs.match_score
  from jobs
  where jobs.embedding is not null
    and 1 - (jobs.embedding <=> profile_embedding) > match_threshold
  order by jobs.embedding <=> profile_embedding
  limit match_count;
$$;
