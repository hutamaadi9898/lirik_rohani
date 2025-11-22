import type { MiddlewareHandler } from 'astro';
import { readBearer } from './lib/adminAuth';

type Env = {
  LYRICS_DB?: D1Database;
  LYRICS_CACHE?: KVNamespace;
  AUDIT_LOG?: KVNamespace;
};

const PROTECTED_PREFIXES = ['/api/admin'];
const AUTH_EXEMPT_PATHS = ['/api/admin/session'];

const baseRedirectMap: Record<string, string> = {
  // sample legacy slugs -> new slugs
  '/song/lagu-baru': '/song/lagu-baru-2025',
  '/song/kasih-setia': '/song/kasih-setia-tuhan',
};

const baseGoneSlugs = new Set<string>(['/song/lagu-dihapus']);

const parseMap = (json: string | undefined): Record<string, string> => {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json) as Record<string, string>;
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([from, to]) => typeof from === 'string' && typeof to === 'string' && from && to)
        .map(([from, to]) => [from.toLowerCase(), to]),
    );
  } catch {
    return {};
  }
};

const parseGone = (csv: string | undefined): Set<string> => {
  if (!csv) return new Set();
  return new Set(
    csv
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
};

export const onRequest: MiddlewareHandler = async (context, next) => {
  const url = new URL(context.request.url);
  const debugVersion = 'song-debug-2025-11-21-6';
  const env = context.locals.runtime?.env as Env | undefined;
  const redirectMap = {
    ...baseRedirectMap,
    ...parseMap(context.locals.runtime?.env?.REDIRECT_MAP_JSON as string | undefined),
  };
  const goneSlugs = new Set([
    ...baseGoneSlugs,
    ...parseGone(context.locals.runtime?.env?.GONE_SLUGS_CSV as string | undefined),
  ]);

  const started = Date.now();

  const bucketLatency = async (ms: number) => {
    if (!env?.AUDIT_LOG) return;
    if (Math.random() > 0.05) return; // 5% sample
    const bucketKey = `metrics:latency:${new Date().toISOString().slice(0, 16)}`; // YYYY-MM-DDTHH:MM
    const thresholds = [25, 50, 75, 100, 200, 500, 1000, 5000];
    const label = thresholds.find((t) => ms <= t) ?? 'gt5000';
    try {
      const current = await env.AUDIT_LOG.get(bucketKey, 'json');
      const data: Record<string, number> = current && typeof current === 'object' ? (current as any) : {};
      data[label] = (data[label] ?? 0) + 1;
      await env.AUDIT_LOG.put(bucketKey, JSON.stringify(data), { expirationTtl: 60 * 90 });
    } catch (err) {
      console.error('Latency bucket write failed', err);
    }
  };

  const applySecurityHeaders = (response: Response) => {
    const clone = new Response(response.body, response);
    clone.headers.set('X-Content-Type-Options', 'nosniff');
    clone.headers.set('Referrer-Policy', 'same-origin');
    clone.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    clone.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    clone.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
    clone.headers.set('X-Debug-Version', debugVersion);
    if (import.meta.env.PROD) {
      clone.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    }
    const duration = Date.now() - started;
    clone.headers.set('Server-Timing', `app;dur=${duration}`);
    clone.headers.set('X-Response-Time', `${duration}ms`);
    bucketLatency(duration);
    return clone;
  };

  const needsAuth =
    !AUTH_EXEMPT_PATHS.includes(url.pathname) &&
    PROTECTED_PREFIXES.some((path) => url.pathname.startsWith(path));

  // Legacy redirect map
  if (redirectMap[url.pathname]) {
    const target = redirectMap[url.pathname];
    const location = url.search ? `${target}${url.search}` : target;
    const absolute = new URL(location, url.origin).toString();
    return applySecurityHeaders(Response.redirect(absolute, 301));
  }

  // 410 for removed songs/slugs
  if (goneSlugs.has(url.pathname)) {
    return applySecurityHeaders(
      new Response('Halaman ini sudah tidak tersedia (410).', {
        status: 410,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      }),
    );
  }

  // Clean slug guard for song pages: lowercase + kebab, no trailing slash
  if (url.pathname.startsWith('/song/')) {
    const slugPart = url.pathname.replace(/^\/song\//, '').replace(/\/$/, '');
    const normalized = slugPart.trim().toLowerCase().replace(/\s+/g, '-');
    if (normalized && normalized !== slugPart) {
      const target = `/song/${normalized}${url.search}`;
      const absolute = new URL(target, url.origin).toString();
      return applySecurityHeaders(Response.redirect(absolute, 301));
    }
  }

  if (needsAuth) {
    const expected = context.locals.runtime?.env?.ADMIN_TOKEN;
    if (!expected) return applySecurityHeaders(new Response('Unauthorized', { status: 401 }));
    const bearer = readBearer(context.request);
    const cookieToken = context.cookies.get('admin_token')?.value;
    const token = bearer?.trim() || cookieToken?.trim();

    const valid = token === expected?.trim();

    if (!valid) {
      return applySecurityHeaders(new Response('Unauthorized', { status: 401 }));
    }

    context.locals.isAdmin = true;
  }

  try {
    const response = await next();
    if (!(response instanceof Response)) {
      const body = JSON.stringify(
        {
          error: 'Non-Response returned from route',
          type: typeof response,
          keys: response && typeof response === 'object' ? Object.keys(response) : [],
          debugVersion,
          path: url.pathname,
        },
        null,
        2,
      );
      return applySecurityHeaders(
        new Response(body, {
          status: 500,
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
        }),
      );
    }
    // Redirect any unknown routes to custom 404 page
    if (response.status === 404 && url.pathname !== '/404') {
      const notFound = new URL('/404', url.origin).toString();
      return applySecurityHeaders(Response.redirect(notFound, 302));
    }

    // Inspect song page responses to catch unexpected bodies.
    if (url.pathname.startsWith('/song/')) {
      try {
        const clone = response.clone();
        const text = await clone.text();
        const snippet = text.slice(0, 120);
        response.headers.set('X-Debug-Body-Len', `${text.length}`);
        response.headers.set('X-Debug-Body-Snippet', snippet);
        // If the body is clearly wrong ("[object Object]"), patch it with a direct DB render.
        const looksBroken = text.trim() === '[object Object]';
        if (looksBroken && env?.LYRICS_DB) {
          const slug = url.pathname.replace(/^\/?song\//, '').replace(/\/$/, '');
          const row = await env.LYRICS_DB.prepare(
            'SELECT id, slug, title, artist, language, typeof(body) AS body_type, body FROM songs WHERE slug = ? LIMIT 1;',
          )
            .bind(slug)
            .first();
          if (row) {
            const toStrings = (value: unknown, seen = new WeakSet<object>()): string[] => {
              if (value === null || value === undefined) return [];
              if (typeof value === 'string') return value.split(/\\r?\\n/).map((l) => l.trim());
              if (Array.isArray(value)) return value.flatMap((v) => toStrings(v, seen));
              if (typeof value === 'object') {
                if (seen.has(value as object)) return [];
                seen.add(value as object);
                return Object.values(value as Record<string, unknown>).flatMap((v) => toStrings(v, seen));
              }
              return [String(value)];
            };

            const bodyText = toStrings((row as any).body).filter(Boolean).join('\\n');
            const titleText = typeof (row as any).title === 'string' ? (row as any).title : 'Lirik';
            const artistText = typeof (row as any).artist === 'string' ? (row as any).artist : '';
            const html = `<!doctype html><html lang=\"id\"><head><meta charset=\"utf-8\"/><title>${titleText}</title></head><body style=\"font-family:sans-serif;background:#0b1224;color:#e2e8f0;padding:24px;\"><h1>${titleText}</h1><p>${artistText}</p><pre style=\"white-space:pre-wrap\">${bodyText}</pre><p style=\"opacity:.6\">(fallback render)</p></body></html>`;
            return applySecurityHeaders(
              new Response(html, {
                status: 200,
                headers: {
                  'Content-Type': 'text/html; charset=utf-8',
                  'X-Debug-Fallback': 'applied',
                  'X-Debug-Version': debugVersion,
                },
              }),
            );
          }
        }
        console.log('Song response debug', {
          path: url.pathname,
          status: response.status,
          len: text.length,
          snippet,
          debugVersion,
        });
      } catch (err) {
        console.error('Song response debug read failed', err);
      }
    }
    return applySecurityHeaders(response);
  } catch (err) {
    const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    const stack = err instanceof Error && err.stack ? err.stack : '';
    console.error('Request error', { path: url.pathname, message, stack });
    return applySecurityHeaders(
      new Response(
        import.meta.env.PROD ? `Error: ${message}` : `Error: ${message}\n${stack}`,
        {
          status: 500,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'X-Error-Message': message,
          },
        },
      ),
    );
  }
};
