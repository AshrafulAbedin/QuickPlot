-- QuickPlot — Supabase (Postgres) schema
-- Run this in the Supabase dashboard → SQL Editor.
-- Identity is provided by Firebase Auth; the Firebase uid arrives in the JWT
-- `sub` claim and is stored in owner_id.

-- ─── Table ───────────────────────────────────────────────────────────────────
create table if not exists public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  owner_id    text        not null,            -- Firebase uid (JWT "sub")
  title       text        not null,
  equations   jsonb       not null default '[]'::jsonb,
  viewport    jsonb       not null,
  sliders     jsonb       not null default '[]'::jsonb,
  theme       jsonb,
  shared      boolean     not null default false,
  share_id    text        unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
-- List a user's workspaces, newest first.
create index if not exists workspaces_owner_updated_idx
  on public.workspaces (owner_id, updated_at desc);

-- Look up a shared workspace by its share_id (only shared rows).
create index if not exists workspaces_share_idx
  on public.workspaces (share_id) where shared = true;

-- ─── updated_at trigger ──────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

-- ─── Row Level Security ──────────────────────────────────────────────────────
alter table public.workspaces enable row level security;

-- The Firebase uid from the verified JWT.
-- (auth.jwt() returns the third-party token's claims when using Firebase auth.)

-- Owner can do everything with their own rows.
drop policy if exists workspaces_owner_all on public.workspaces;
create policy workspaces_owner_all
  on public.workspaces
  for all
  using ( (auth.jwt() ->> 'sub') = owner_id )
  with check ( (auth.jwt() ->> 'sub') = owner_id );

-- Anyone (even anonymous) can read a shared workspace.
drop policy if exists workspaces_public_read_shared on public.workspaces;
create policy workspaces_public_read_shared
  on public.workspaces
  for select
  using ( shared = true );
