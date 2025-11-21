import type { APIRoute } from 'astro';

export const prerender = false;

type Env = { LYRICS_DB?: D1Database };

export const GET: APIRoute = async ({ locals }) => {
  const env = locals.runtime?.env as Env | undefined;
  if (!env?.LYRICS_DB) {
    return new Response(JSON.stringify({ ok: false, reason: 'db_missing' }), { status: 500 });
  }
  try {
    await env.LYRICS_DB.prepare('SELECT 1;').run();
    return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, reason: 'db_error', message: (err as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};
