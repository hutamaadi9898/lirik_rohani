import type { APIRoute } from 'astro';

export const prerender = false;

type Env = { LYRICS_DB?: D1Database; LYRICS_CACHE?: KVNamespace; AUDIT_LOG?: KVNamespace };

export const GET: APIRoute = async ({ locals }) => {
  const env = locals.runtime?.env as Env | undefined;
  const started = Date.now();
  const result = {
    ok: true,
    ts: Date.now(),
    checks: {
      db: false,
      tables: false,
      fts: false,
      kv: !!env?.LYRICS_CACHE,
    },
    count: 0,
    duration_ms: 0,
  };

  if (!env?.LYRICS_DB) {
    return new Response(JSON.stringify({ ok: false, reason: 'db_missing' }), { status: 500 });
  }

  try {
    const ping = await env.LYRICS_DB.prepare('SELECT 1;').first();
    result.checks.db = ping !== null;

    const tables = await env.LYRICS_DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('songs','songs_fts');",
    ).all<{ name: string }>();
    result.checks.tables = (tables.results ?? []).some((r) => r.name === 'songs');
    result.checks.fts = (tables.results ?? []).some((r) => r.name === 'songs_fts');

    const countRow = await env.LYRICS_DB.prepare('SELECT COUNT(*) AS c FROM songs;').first<{ c: number | string }>();
    result.count = Number(countRow?.c ?? 0);

    result.duration_ms = Date.now() - started;
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (err) {
    result.ok = false;
    return new Response(
      JSON.stringify({ ...result, reason: 'db_error', message: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } },
    );
  }
};
