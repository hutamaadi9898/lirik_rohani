import type { APIRoute } from 'astro';

type Env = {
  LYRICS_DB: D1Database;
  LYRICS_CACHE?: KVNamespace;
  AUDIT_LOG?: KVNamespace;
  ADMIN_TOKEN?: string;
};

const respond = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

const log = async (env: Env, action: string, payload: unknown) => {
  if (!env.AUDIT_LOG) return;
  const ts = new Date().toISOString();
  await env.AUDIT_LOG.put(`audit:${ts}:${crypto.randomUUID()}`, JSON.stringify({ action, payload, ts }));
};

const checkAuth = (request: Request, env: Env) => {
  const expected = env.ADMIN_TOKEN;
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const queryToken = new URL(request.url).searchParams.get('token');
  const token = bearer || queryToken;
  return Boolean(expected && token === expected);
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || crypto.randomUUID();

export const prerender = false;

export const OPTIONS: APIRoute = () =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    },
  });

export const GET: APIRoute = async ({ locals, request }) => {
  const env = locals.runtime?.env as Env;
  if (!checkAuth(request, env)) return respond({ ok: false, error: 'Unauthorized' }, 401);
  const { results } = await env.LYRICS_DB.prepare(
    'SELECT id, slug, title, artist, language FROM songs ORDER BY updated_at DESC LIMIT 200;',
  ).all();
  return respond({ ok: true, data: results ?? [] });
};

export const POST: APIRoute = async ({ locals, request }) => {
  const env = locals.runtime?.env as Env;
  if (!checkAuth(request, env)) return respond({ ok: false, error: 'Unauthorized' }, 401);
  const body = await request.json();
  const { slug, title, artist, language = 'id', body: lyrics } = body;
  if (!title || !lyrics) return respond({ ok: false, error: 'Missing fields' }, 400);

  const finalSlug = slug?.trim() ? slugify(slug) : slugify(title);

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
    .bind(finalSlug, title, artist, language, lyrics)
    .run();

  await env.LYRICS_CACHE?.delete(`search:${finalSlug}`);
  await log(env, 'upsert', { slug: finalSlug, title });
  return respond({ ok: true, data: { slug: finalSlug, title } });
};

export const DELETE: APIRoute = async ({ locals, url, request }) => {
  const env = locals.runtime?.env as Env;
  if (!checkAuth(request, env)) return respond({ ok: false, error: 'Unauthorized' }, 401);
  const slug = url.searchParams.get('slug');
  if (!slug) return respond({ ok: false, error: 'Missing slug' }, 400);
  await env.LYRICS_DB.prepare('DELETE FROM songs WHERE slug = ?;').bind(slug).run();
  await env.LYRICS_CACHE?.delete(`search:${slug}`);
  await log(env, 'delete', { slug });
  return respond({ ok: true, data: null });
};
