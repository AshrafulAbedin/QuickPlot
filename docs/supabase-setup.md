# QuickPlot — Firebase Auth + Supabase (Postgres) Setup

QuickPlot uses **Firebase Auth** for identity and **Supabase (Postgres)** for
data. This is the setup a new developer needs to run the backend locally.

## Architecture

```
User → Firebase Auth (Google login)  →  Firebase ID token (JWT)
                                            │
                                            ▼
        Supabase client (accessToken = Firebase token)
                                            │
                                            ▼
        Postgres + Row Level Security  (auth.jwt()->>'sub' = Firebase uid)
```

## One-time project setup

### 1. Create a Supabase project
- https://supabase.com → New project
- Note the **Project URL** and **publishable (anon) key** (Project Settings → API)

### 2. Create the schema
- Dashboard → **SQL Editor** → run [`code/supabase/schema.sql`](../code/supabase/schema.sql)
- Creates the `workspaces` table, indexes, `updated_at` trigger, and RLS policies

### 3. Trust Firebase tokens (Third-Party Auth)
- Dashboard → **Authentication → Third-Party Auth** → add **Firebase**
- Enter the Firebase **project ID**: `quickplot-213a3`
- Supabase now validates Firebase JWTs and exposes their claims (`sub` = Firebase uid) to RLS

### 4. Environment variables
In `code/apps/web/.env`:
```
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable key, sb_publishable_...>
```
> Use the base project URL — **not** the `/rest/v1/` endpoint.
> Never put the `service_role` / secret key in the client.

### 5. Run
```
cd code
pnpm dev
```

## How the code is wired

- `src/lib/supabase.ts` — Supabase client; its `accessToken` returns the current
  Firebase ID token, so every request carries the Firebase identity.
- `src/lib/workspaces-supabase.ts` — typed CRUD against the `workspaces` table
  (maps snake_case columns ↔ camelCase `@quickplot/types`).
- `src/lib/db.ts` — thin facade the app imports from. Swapping persistence later
  means changing only this re-export.
- Hooks (`useWorkspace`, `useWorkspaceList`, `useSharedWorkspace`) and all UI go
  through `lib/db`, so they're backend-agnostic.

## Notes
- The Firebase uid is stored in `owner_id`. RLS scopes access with
  `(auth.jwt() ->> 'sub') = owner_id`.
- Shared workspaces are world-readable via the `workspaces_public_read_shared`
  policy — no auth required — which powers `/shared/:shareId`.
