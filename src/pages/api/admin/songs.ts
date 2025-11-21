import type { APIRoute } from 'astro';

type Env = {
  LYRICS_DB: D1Database;
  LYRICS_CACHE?: KVNamespace;
  AUDIT_LOG?: KVNamespace;
};

const respond = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

const log = async (env: Env, action: string, payload: unknown) => {
  if (!env.AUDIT_LOG) return;
  const ts = new Date().toISOString();
  await env.AUDIT_LOG.put(`audit:${ts}:${crypto.randomUUID()}`, JSON.stringify({ action, payload, ts }));
};

export const GET: APIRoute = async ({ locals }) => {
  const env = locals.runtime?.env as Env;
  const { results } = await env.LYRICS_DB.prepare(
    'SELECT id, slug, title, artist, language FROM songs ORDER BY updated_at DESC LIMIT 200;',
  ).all();
  return respond({ ok: true, data: results ?? [] });
};

export const POST: APIRoute = async ({ locals, request }) => {
  const env = locals.runtime?.env as Env;
  const body = await request.json();
  const { slug, title, artist, language = 'id', body: lyrics } = body;
  if (!slug || !title || !lyrics) return respond({ ok: false, error: 'Missing fields' }, 400);

  await env.LYRICS_DB.prepare(
    `INSERT INTO songs (id, slug, title, artist, language, body, created_at, updated_at)
     VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, unixepoch(), unixepoch())
     ON CONFLICT(slug) DO UPDATE SET
       title=excluded.title,
       artist=excluded.artist,
       language=excluded.language,
       body=excluded.body,
       updated_at=unixepoch();`,
  )
    .bind(slug, title, artist, language, lyrics)
    .run();

  await env.LYRICS_CACHE?.delete(`search:${slug}`);
  await log(env, 'upsert', { slug, title });
  return respond({ ok: true, data: { slug, title } });
};

export const DELETE: APIRoute = async ({ locals, url }) => {
  const env = locals.runtime?.env as Env;
  const slug = url.searchParams.get('slug');
  if (!slug) return respond({ ok: false, error: 'Missing slug' }, 400);
  await env.LYRICS_DB.prepare('DELETE FROM songs WHERE slug = ?;').bind(slug).run();
  await env.LYRICS_CACHE?.delete(`search:${slug}`);
  await log(env, 'delete', { slug });
  return respond({ ok: true, data: null });
};
