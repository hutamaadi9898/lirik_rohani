import type { APIRoute } from 'astro';
import { readBearer } from '@/lib/adminAuth';

type Env = { ADMIN_TOKEN?: string; AUDIT_LOG?: KVNamespace };

const respond = (obj: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extraHeaders },
  });

export const POST: APIRoute = async ({ locals, request }) => {
  const env = locals.runtime?.env as Env;
  const expected = env.ADMIN_TOKEN?.trim();
  if (!expected) return respond({ ok: false, error: 'Unauthorized' }, 401);

  // Prefer Authorization header; fall back to JSON body token only if header missing.
  let provided = readBearer(request)?.trim();
  if (!provided) {
    const body = (await request.json().catch(() => null)) as { token?: string } | null;
    provided = body?.token?.trim();
  }

  if (!provided || provided !== expected) return respond({ ok: false, error: 'Unauthorized' }, 401);

  const maxAgeSeconds = 60 * 60 * 12;
  const secure = import.meta.env.PROD;
  const cookie = [
    `admin_token=${encodeURIComponent(provided)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAgeSeconds}`,
    secure ? 'Secure' : undefined,
  ]
    .filter(Boolean)
    .join('; ');

  if (env.AUDIT_LOG) {
    const ts = new Date().toISOString();
    await env.AUDIT_LOG.put(`audit:${ts}:${crypto.randomUUID()}`, JSON.stringify({ action: 'session', ts }));
  }

  return respond({ ok: true, data: null }, 200, { 'Set-Cookie': cookie });
};

export const prerender = false;
