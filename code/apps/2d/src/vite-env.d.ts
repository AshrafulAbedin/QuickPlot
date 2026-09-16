/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Sibling grapher routes, linked from the header. Fall back to the dev ports. */
  readonly VITE_URL_2D?: string;
  readonly VITE_URL_3D?: string;
  /** Sign-in (Firebase Auth). Optional: guests can plot without it. */
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  /** Workspace storage (Supabase Postgres). Optional. */
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
