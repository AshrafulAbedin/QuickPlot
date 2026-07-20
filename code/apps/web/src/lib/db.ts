/**
 * Database facade — the single entry point for workspace persistence.
 *
 * Backend: Supabase (Postgres), with Firebase Auth providing identity.
 * The rest of the app imports data functions from here (not the concrete
 * implementation), so changing persistence later is a one-line change.
 */
export * from './workspaces-supabase'
