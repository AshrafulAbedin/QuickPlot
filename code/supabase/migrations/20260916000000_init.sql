-- QuickPlot schema v1: profiles, workspaces, collaborators, RLS.
-- Apply with `supabase db push` or paste into Dashboard > SQL Editor.
--
-- Identity comes from FIREBASE AUTH, not Supabase Auth. Supabase verifies the
-- Firebase ID token (Dashboard > Authentication > Third-Party Auth > Firebase)
-- and exposes its claims as auth.jwt(). Consequences:
--   * user ids are Firebase uids (text), never uuid, so auth.uid() is unusable;
--     every policy reads (auth.jwt() ->> 'sub') via current_uid() below.
--   * nothing in auth.users refers to these users, so profiles are created by
--     the ensure_profile() RPC the client calls after sign-in, not by a trigger.

create extension if not exists pgcrypto;

-- ── helpers ────────────────────────────────────────────────────────────────

-- Firebase uid of the caller, or null for anonymous requests.
create or replace function public.current_uid()
returns text language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- 16 hex chars (64 random bits): short enough for a URL, not guessable.
create or replace function public.gen_share_token()
returns text language sql volatile as $$
  select encode(gen_random_bytes(8), 'hex')
$$;

-- ── profiles ───────────────────────────────────────────────────────────────

create table public.profiles (
  id           text primary key,          -- Firebase uid
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Emails live apart from profiles so they are never readable through the API.
-- RLS is on with no policies: only SECURITY DEFINER functions can touch this.
create table public.profile_emails (
  profile_id text primary key references public.profiles (id) on delete cascade,
  email      text not null
);
create unique index profile_emails_email_idx on public.profile_emails (lower(email));

-- Called by the client after every sign-in. All values come from the verified
-- token, so a user can only ever create or refresh their own row.
create or replace function public.ensure_profile()
returns void language plpgsql security definer set search_path = public as $$
declare
  claims jsonb := auth.jwt();
  uid    text  := public.current_uid();
begin
  if uid is null then
    raise exception 'not signed in';
  end if;

  insert into public.profiles (id, display_name, avatar_url)
  values (
    uid,
    coalesce(claims ->> 'name', split_part(claims ->> 'email', '@', 1)),
    claims ->> 'picture'
  )
  on conflict (id) do update
    set display_name = coalesce(excluded.display_name, profiles.display_name),
        avatar_url   = coalesce(excluded.avatar_url,   profiles.avatar_url);

  if claims ->> 'email' is not null then
    insert into public.profile_emails (profile_id, email)
    values (uid, claims ->> 'email')
    on conflict (profile_id) do update set email = excluded.email;
  end if;
end $$;

-- ── workspaces ─────────────────────────────────────────────────────────────

create table public.workspaces (
  id             uuid primary key default gen_random_uuid(),
  owner_id       text not null default public.current_uid() references public.profiles (id) on delete cascade,
  title          text not null check (char_length(title) between 1 and 120),
  description    text check (char_length(description) <= 2000),
  -- Shape of the four jsonb columns; bump WORKSPACE_SCHEMA_VERSION in @quickplot/types together.
  schema_version int  not null default 1,
  equations      jsonb not null default '[]'::jsonb,
  viewport       jsonb not null,
  sliders        jsonb not null default '[]'::jsonb,
  theme          jsonb,
  is_public      boolean not null default false,
  share_token    text not null unique default public.gen_share_token(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  last_opened_at timestamptz
);

create index workspaces_owner_updated_idx on public.workspaces (owner_id, updated_at desc);
create index workspaces_public_token_idx  on public.workspaces (share_token) where is_public;

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row execute function public.set_updated_at();

-- ── collaborators ──────────────────────────────────────────────────────────

create table public.workspace_collaborators (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id      text not null references public.profiles (id) on delete cascade,
  role         text not null check (role in ('viewer', 'editor')),
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_collaborators_user_idx on public.workspace_collaborators (user_id);

-- ── access helpers ─────────────────────────────────────────────────────────
-- SECURITY DEFINER so policies on workspaces and collaborators can consult
-- each other without recursing through RLS.

create or replace function public.is_workspace_owner(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.workspaces w where w.id = ws and w.owner_id = public.current_uid()
  )
$$;

-- 'owner' | 'editor' | 'viewer' | null for the calling user.
create or replace function public.workspace_role(ws uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when public.is_workspace_owner(ws) then 'owner'
    else (select c.role from public.workspace_collaborators c
          where c.workspace_id = ws and c.user_id = public.current_uid())
  end
$$;

-- Editors may change content, but only the owner controls ownership and sharing.
create or replace function public.guard_owner_only_columns()
returns trigger language plpgsql as $$
begin
  if new.owner_id <> old.owner_id then
    raise exception 'owner_id is immutable';
  end if;
  if new.is_public <> old.is_public and old.owner_id is distinct from public.current_uid() then
    raise exception 'only the owner can change sharing';
  end if;
  return new;
end $$;

create trigger workspaces_guard_owner_only
  before update on public.workspaces
  for each row execute function public.guard_owner_only_columns();

-- ── RLS ────────────────────────────────────────────────────────────────────

alter table public.profiles                enable row level security;
alter table public.profile_emails          enable row level security;
alter table public.workspaces              enable row level security;
alter table public.workspace_collaborators enable row level security;

-- profiles: any signed-in user can read names/avatars (needed to list collaborators); only you edit yours.
-- Inserts happen only through ensure_profile().
create policy profiles_read   on public.profiles for select to authenticated using (true);
create policy profiles_update on public.profiles for update to authenticated
  using (id = public.current_uid()) with check (id = public.current_uid());

-- workspaces
create policy workspaces_select on public.workspaces for select
  using (is_public or public.workspace_role(id) is not null);

create policy workspaces_insert on public.workspaces for insert to authenticated
  with check (owner_id = public.current_uid());

create policy workspaces_update on public.workspaces for update to authenticated
  using (public.workspace_role(id) in ('owner', 'editor'))
  with check (public.workspace_role(id) in ('owner', 'editor'));

create policy workspaces_delete on public.workspaces for delete to authenticated
  using (owner_id = public.current_uid());

-- collaborators: owner manages the list; members can see their own membership.
create policy collaborators_select on public.workspace_collaborators for select to authenticated
  using (public.is_workspace_owner(workspace_id) or user_id = public.current_uid());

create policy collaborators_write on public.workspace_collaborators for all to authenticated
  using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

-- ── RPCs ───────────────────────────────────────────────────────────────────

-- Invite by email without exposing an email -> user-id lookup to the client.
create or replace function public.add_collaborator_by_email(ws uuid, target_email text, target_role text)
returns void language plpgsql security definer set search_path = public as $$
declare
  target_id text;
begin
  if not public.is_workspace_owner(ws) then
    raise exception 'only the owner can add collaborators';
  end if;
  if target_role not in ('viewer', 'editor') then
    raise exception 'role must be viewer or editor';
  end if;

  select profile_id into target_id from public.profile_emails
   where lower(email) = lower(target_email) limit 1;
  if target_id is null then
    raise exception 'no QuickPlot account for % (they need to sign in once first)', target_email;
  end if;
  if target_id = public.current_uid() then
    raise exception 'you already own this workspace';
  end if;

  insert into public.workspace_collaborators (workspace_id, user_id, role)
  values (ws, target_id, target_role)
  on conflict (workspace_id, user_id) do update set role = excluded.role;
end $$;

-- Anyone who can see the workspace (including via a public link) may stamp last_opened_at.
create or replace function public.mark_workspace_opened(ws uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.workspaces
     set last_opened_at = now()
   where id = ws
     and (is_public or public.workspace_role(id) is not null);
end $$;

revoke execute on function public.ensure_profile()                              from public, anon;
revoke execute on function public.add_collaborator_by_email(uuid, text, text)   from public, anon;
grant  execute on function public.ensure_profile()                              to authenticated;
grant  execute on function public.add_collaborator_by_email(uuid, text, text)   to authenticated;
grant  execute on function public.mark_workspace_opened(uuid)                   to anon, authenticated;
