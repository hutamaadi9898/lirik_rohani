import type { APIRoute } from 'astro';

export const prerender = false;

type Env = {
  LYRICS_DB: D1Database;
  LYRICS_CACHE?: KVNamespace;
};

export const GET: APIRoute = async ({ request, locals }) => {
  const runtime = locals.runtime;
  const env = runtime?.env as Env | undefined;
  if (!env?.LYRICS_DB) {
    return new Response(JSON.stringify({ error: 'DB not bound' }), { status: 500 });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10) || 10, 50);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);

  if (!q) {
    return new Response(JSON.stringify({ results: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cacheKey = `search:${q}:${limit}:${offset}`;
  if (env.LYRICS_CACHE) {
    const cached = await env.LYRICS_CACHE.get(cacheKey, 'json');
    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
      });
    }
  }

  const statement = env.LYRICS_DB.prepare(
    `
    SELECT s.id, s.slug, s.title, s.artist, s.language,
      snippet(songs_fts, 1, '<mark>', '</mark>', '…', 12) AS snippet
    FROM songs_fts
    JOIN songs s ON s.rowid = songs_fts.rowid
    WHERE songs_fts MATCH ?
    ORDER BY rank
    LIMIT ? OFFSET ?;`,
  ).bind(q, limit, offset);

  const { results } = await statement.all();

  const payload = { results: results ?? [] };

  if (env.LYRICS_CACHE) {
    await env.LYRICS_CACHE.put(cacheKey, JSON.stringify(payload), { expirationTtl: 300 });
  }

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
