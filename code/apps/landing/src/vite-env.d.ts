/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Sibling grapher routes, linked from the header. Fall back to the dev ports. */
  readonly VITE_URL_2D?: string;
  readonly VITE_URL_3D?: string;
  /** Supabase project (auth + workspace storage). Optional: guests can plot without it. */
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
