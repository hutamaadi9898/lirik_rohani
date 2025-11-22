/// <reference types="astro/client" />

interface Env {
  LYRICS_DB: D1Database;
  LYRICS_CACHE: KVNamespace;
  AUDIT_LOG: KVNamespace;
  ADMIN_TOKEN: string;
}

declare namespace App {
  interface Locals {
    runtime?: { env: Partial<Env> & Record<string, unknown> };
    isAdmin?: boolean;
  }
}
