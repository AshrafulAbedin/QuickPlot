/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Sibling grapher, linked from the header. Falls back to the dev port. */
  readonly VITE_URL_2D?: string;
  readonly VITE_URL_3D?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
