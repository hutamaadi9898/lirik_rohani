import type { APIRoute } from 'astro';

export const prerender = false;

type Env = {
  LYRICS_DB?: D1Database;
};

export const GET: APIRoute = async ({ url, locals }) => {
  const slug = url.searchParams.get('slug') || '';
  const runtime = locals.runtime;
  const env = (runtime?.env ?? {}) as Env;

  const hasDb = Boolean(env.LYRICS_DB);
  let song: Record<string, unknown> | null = null;
  let error: string | null = null;

  if (!slug) {
    return new Response(JSON.stringify({ ok: false, error: 'missing slug', hasDb }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  if (!env.LYRICS_DB) {
    return new Response(JSON.stringify({ ok: false, error: 'LYRICS_DB missing', hasDb }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }

  try {
    const row = await env.LYRICS_DB.prepare(
      'SELECT id, slug, title, artist, language, typeof(body) as body_type, body FROM songs WHERE slug = ? LIMIT 1;'
    )
      .bind(slug)
      .first();
    song = row as Record<string, unknown> | null;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  return new Response(JSON.stringify({ ok: !error && !!song, hasDb, slug, song, error }), {
    status: error ? 500 : 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};
