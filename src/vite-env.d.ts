/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional named Firestore database ID. Leave unset to use the project's "(default)" database. */
  readonly VITE_FIRESTORE_DATABASE_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
