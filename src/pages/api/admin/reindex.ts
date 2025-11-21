import type { APIRoute } from 'astro';

type Env = { LYRICS_DB: D1Database; AUDIT_LOG?: KVNamespace };

const respond = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

export const POST: APIRoute = async ({ locals }) => {
  const env = locals.runtime?.env as Env;
  await env.LYRICS_DB.prepare(`INSERT INTO songs_fts(songs_fts) VALUES ('rebuild');`).run();
  if (env.AUDIT_LOG) {
    const ts = new Date().toISOString();
    await env.AUDIT_LOG.put(`audit:${ts}:${crypto.randomUUID()}`, JSON.stringify({ action: 'reindex', ts }));
  }
  return respond({ ok: true });
};
