/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_URL_2D?: string;
  readonly VITE_URL_3D?: string;
  readonly VITE_AUTH_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
