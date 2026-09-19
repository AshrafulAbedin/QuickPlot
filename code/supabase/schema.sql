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

create index if not exists workspaces_owner_updated_idx
  on public.workspaces (owner_id, updated_at desc);

create index if not exists workspaces_share_idx
  on public.workspaces (share_id) where shared = true;

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


alter table public.workspaces enable row level security;

drop policy if exists workspaces_owner_all on public.workspaces;
create policy workspaces_owner_all
  on public.workspaces
  for all
  using ( (auth.jwt() ->> 'sub') = owner_id )
  with check ( (auth.jwt() ->> 'sub') = owner_id );


drop policy if exists workspaces_public_read_shared on public.workspaces;
create policy workspaces_public_read_shared
  on public.workspaces
  for select
  using ( shared = true );
