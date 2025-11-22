import type { APIRoute } from 'astro';

export const prerender = false;

type Env = {
  LYRICS_DB: D1Database;
  LYRICS_CACHE?: KVNamespace;
};

const DEFAULT_QUERIES = ['kasih', 'bapa', 'kudus', 'yesus', 'above all', 'allah itu baik'];

async function warm(env: Env, queries: string[]) {
  const warmed: Record<string, number> = {};

  for (const q of queries) {
    const match = q.trim();
    if (!match) continue;
    const statement = env.LYRICS_DB.prepare(
      `SELECT s.id, s.slug, s.title, s.artist, s.language,
        snippet(songs_fts, 1, '<mark>', '</mark>', '…', 12) AS snippet
      FROM songs_fts
      JOIN songs s ON s.rowid = songs_fts.rowid
      WHERE songs_fts MATCH ?
      ORDER BY rank
      LIMIT 10;`,
    ).bind(match);
    const { results } = await statement.all();
    const payload = { results: (results ?? []).map((r) => ({ ...r, snippet: typeof r.snippet === 'string' ? r.snippet : '' })) };
    if (env.LYRICS_CACHE) {
      await env.LYRICS_CACHE.put(`search:${match}:10:0:all:f`, JSON.stringify(payload), { expirationTtl: 300 });
    }
    warmed[match] = (payload.results ?? []).length;
  }

  return warmed;
}

export const GET: APIRoute = async ({ locals, request }) => {
  const env = locals.runtime?.env as Env | undefined;
  if (!env?.LYRICS_DB) {
    return json({ ok: false, reason: 'db_missing' }, 500);
  }

  const token = request.headers.get('authorization')?.replace(/Bearer /i, '')?.trim();
  const expected = locals.runtime?.env?.ADMIN_TOKEN as string | undefined;
  if (expected && token !== expected.trim()) {
    return json({ ok: false, reason: 'unauthorized' }, 401);
  }

  const warmed = await warm(env, DEFAULT_QUERIES);
  return json({ ok: true, warmed });
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
