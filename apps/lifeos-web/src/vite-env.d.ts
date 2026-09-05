/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_TRUSTID_API: string;
  readonly VITE_TRUSTID_CLIENT_ID: string;
  readonly VITE_TRUSTID_REDIRECT_URI: string;
  readonly VITE_TRUSTID_SCOPES: string;
  readonly VITE_LIFEOS_API: string;
  readonly VITE_TRUSTID_WEB: string;
  readonly VITE_SERVICEOS_API_URL?: string;
  readonly VITE_DIGICONOMY_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
