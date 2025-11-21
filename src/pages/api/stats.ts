import type { APIRoute } from 'astro';

type Env = {
  LYRICS_DB?: D1Database;
};

type Row = { slug: string; title: string; artist: string | null; updated_at: number | null };

type Payload = {
  total: number;
  latest: Row[];
};

export const prerender = false;

export const GET: APIRoute = async ({ locals, request }) => {
  const env = (locals.runtime?.env ?? {}) as Env;
  if (!env.LYRICS_DB) {
    return new Response(JSON.stringify({ error: 'Database binding missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const totalRes = await env.LYRICS_DB.prepare('SELECT COUNT(*) as count FROM songs;').first<{ count: number | string }>();
  const latestRes = await env.LYRICS_DB.prepare(
    'SELECT slug, title, artist, updated_at FROM songs ORDER BY updated_at DESC LIMIT 6;',
  ).all<Row>();

  const payload: Payload = {
    total: Number(totalRes?.count ?? 0),
    latest: (latestRes.results ?? []).map((row) => ({
      ...row,
      artist: typeof row.artist === 'string' ? row.artist : null,
      updated_at: row.updated_at ?? null,
    })),
  };

  const payloadString = JSON.stringify(payload);
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(payloadString));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const etag = `W/"${hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')}"`;

  if (request.headers.get('If-None-Match') === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        'Cache-Control': 'public, max-age=60',
      },
    });
  }

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
      ETag: etag,
    },
  });
};
