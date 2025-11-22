import type { APIRoute } from 'astro';

export const prerender = false;

type Env = {
  LYRICS_DB: D1Database;
  LYRICS_CACHE?: KVNamespace;
};

const buildMatch = (query: string, titleOnly: boolean) => {
  if (!titleOnly) return query;
  const tokens = query
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => `"${t.replace(/"/g, '""')}"`);
  if (!tokens.length) return query;
  return `title:(${tokens.join(' AND ')})`;
};

export const GET: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime?.env as Env | undefined;
  if (!env?.LYRICS_DB) {
    return new Response(JSON.stringify({ error: 'DB not bound' }), { status: 500 });
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10) || 10, 50);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);
  const lang = url.searchParams.get('lang') ?? 'all'; // all | id | en
  const titleOnly = url.searchParams.get('titleOnly') === '1';

  if (!q) {
    return new Response(JSON.stringify({ results: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cacheKey = `search:${q}:${limit}:${offset}:${lang}:${titleOnly ? 't' : 'f'}`;
  if (env.LYRICS_CACHE) {
    const cached = await env.LYRICS_CACHE.get(cacheKey, 'json');
    if (cached) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
      });
    }
  }

  const match = buildMatch(q, titleOnly);

  const baseSql = `
    SELECT s.id, s.slug, s.title, s.artist, s.language,
      snippet(songs_fts, 1, '<mark>', '</mark>', '…', 12) AS snippet
    FROM songs_fts
    JOIN songs s ON s.rowid = songs_fts.rowid
    WHERE songs_fts MATCH ?
    ${lang !== 'all' ? 'AND s.language = ?' : ''}
    ORDER BY rank
    LIMIT ? OFFSET ?;`;

  const statement = env.LYRICS_DB.prepare(baseSql);
  const binds: (string | number)[] = lang !== 'all' ? [match, lang, limit, offset] : [match, limit, offset];
  const res = await statement.bind(...binds).all();

  // Ensure snippet is string to avoid rendering [object Object]
  const safeResults = (res.results ?? []).map((row) => ({
    ...row,
    snippet: typeof row.snippet === 'string' ? row.snippet : '',
  }));

  const payload = { results: safeResults };

  if (env.LYRICS_CACHE) {
    await env.LYRICS_CACHE.put(cacheKey, JSON.stringify(payload), { expirationTtl: 300 });
  }

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
