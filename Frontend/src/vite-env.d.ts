/// <reference types="vite/client" />

// Typed access to our env variables (import.meta.env.VITE_API_URL).
interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
