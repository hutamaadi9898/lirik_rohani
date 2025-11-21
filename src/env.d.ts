/// <reference types="astro/client" />

interface Env {
  LYRICS_DB: D1Database;
  LYRICS_CACHE: KVNamespace;
  AUDIT_LOG: KVNamespace;
  ADMIN_TOKEN: string;
}
