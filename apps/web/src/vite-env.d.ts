/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL completa del canal de colaboracion, si no vale la deducida del origen. */
  readonly VITE_COLLAB_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
