/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LIFEOS_API?: string;
  readonly VITE_LIFEOS_WEB?: string;
  readonly VITE_EXPERIENCE_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
