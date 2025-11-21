import type { APIRoute } from 'astro';
import { isAdminAuthorized } from '@/lib/adminAuth';

type Env = {
  LYRICS_DB: D1Database;
  LYRICS_CACHE?: KVNamespace;
  AUDIT_LOG?: KVNamespace;
  ADMIN_TOKEN?: string;
};

const checkAuth = (request: Request, env: Env, locals: { isAdmin?: boolean }) =>
  isAdminAuthorized(request, env, locals);

const respond = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const log = async (env: Env, action: string, payload: unknown) => {
  if (!env.AUDIT_LOG) return;
  const ts = new Date().toISOString();
  await env.AUDIT_LOG.put(`audit:${ts}:${crypto.randomUUID()}`, JSON.stringify({ action, payload, ts }));
};

const unwrapError = (err: unknown) => (err instanceof Error ? err.message : String(err));

const mapDbError = (err: unknown) => {
  const msg = unwrapError(err);
  if (msg.includes('no such table') || msg.includes('no such column')) {
    return 'Database not migrated';
  }
  return 'Server error';
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

export const OPTIONS: APIRoute = ({ request }) => {
  const origin = new URL(request.url).origin;
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Credentials': 'true',
      Vary: 'Origin',
    },
  });
};

export const GET: APIRoute = async ({ locals, request }) => {
  const env = (locals.runtime?.env ?? {}) as Env;
  if (!checkAuth(request, env, locals)) return respond({ ok: false, error: 'Unauthorized' }, 401);
  if (!env.LYRICS_DB) return respond({ ok: false, error: 'Database not bound' }, 500);
  try {
    const { results } = await env.LYRICS_DB.prepare(
      'SELECT id, slug, title, artist, language FROM songs ORDER BY updated_at DESC LIMIT 200;',
    ).all();
    return respond({ ok: true, data: results ?? [] });
  } catch (err) {
    return respond({ ok: false, error: mapDbError(err), detail: unwrapError(err) }, 500);
  }
};

export const POST: APIRoute = async ({ locals, request }) => {
  const env = (locals.runtime?.env ?? {}) as Env;
  if (!checkAuth(request, env, locals)) return respond({ ok: false, error: 'Unauthorized' }, 401);
  if (!env.LYRICS_DB) return respond({ ok: false, error: 'Database not bound' }, 500);

  const body = (await request.json().catch(() => null)) as
    | { slug?: unknown; title?: unknown; artist?: unknown; language?: unknown; body?: unknown }
    | null;
  if (!body) return respond({ ok: false, error: 'Invalid JSON' }, 400);
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const lyrics = typeof body.body === 'string' ? body.body : '';
  const slugRaw = typeof body.slug === 'string' ? body.slug : '';
  const artist = typeof body.artist === 'string' ? body.artist : null;
  const language = typeof body.language === 'string' ? body.language : 'id';
  if (!title || !lyrics) return respond({ ok: false, error: 'Missing fields' }, 400);

  const finalSlug = slugRaw?.trim() ? slugify(slugRaw) : slugify(title);

  try {
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
  } catch (err) {
    return respond({ ok: false, error: mapDbError(err), detail: unwrapError(err) }, 500);
  }

  await env.LYRICS_CACHE?.delete(`search:${finalSlug}`);
  await log(env, 'upsert', { slug: finalSlug, title });
  return respond({ ok: true, data: { slug: finalSlug, title } });
};

export const DELETE: APIRoute = async ({ locals, url, request }) => {
  const env = (locals.runtime?.env ?? {}) as Env;
  if (!checkAuth(request, env, locals)) return respond({ ok: false, error: 'Unauthorized' }, 401);
  if (!env.LYRICS_DB) return respond({ ok: false, error: 'Database not bound' }, 500);
  const slug = url.searchParams.get('slug');
  if (!slug) return respond({ ok: false, error: 'Missing slug' }, 400);
  try {
    await env.LYRICS_DB.prepare('DELETE FROM songs WHERE slug = ?;').bind(slug).run();
  } catch (err) {
    return respond({ ok: false, error: mapDbError(err), detail: unwrapError(err) }, 500);
  }
  await env.LYRICS_CACHE?.delete(`search:${slug}`);
  await log(env, 'delete', { slug });
  return respond({ ok: true, data: null });
};
