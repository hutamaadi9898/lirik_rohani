import type { APIRoute } from 'astro';
import { isAdminAuthorized } from '@/lib/adminAuth';

type Env = { LYRICS_DB: D1Database; AUDIT_LOG?: KVNamespace; ADMIN_TOKEN?: string };

const respond = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export const POST: APIRoute = async ({ locals, request }) => {
  const env = (locals.runtime?.env ?? {}) as Env;
  if (!isAdminAuthorized(request, env, locals)) {
    return respond({ ok: false, error: 'Unauthorized' }, 401);
  }
  await env.LYRICS_DB.prepare(`INSERT INTO songs_fts(songs_fts) VALUES ('rebuild');`).run();
  if (env.AUDIT_LOG) {
    const ts = new Date().toISOString();
    await env.AUDIT_LOG.put(`audit:${ts}:${crypto.randomUUID()}`, JSON.stringify({ action: 'reindex', ts }));
  }
  return respond({ ok: true });
};

export const prerender = false;
