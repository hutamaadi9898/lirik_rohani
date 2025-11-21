import type { MiddlewareHandler } from 'astro';
import { readBearer } from './lib/adminAuth';

const PROTECTED_PREFIXES = ['/api/admin'];
const AUTH_EXEMPT_PATHS = ['/api/admin/session'];

export const onRequest: MiddlewareHandler = async (context, next) => {
  const url = new URL(context.request.url);
  const debugVersion = 'song-debug-2025-11-21-6';

  const applySecurityHeaders = (response: Response) => {
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'same-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
    response.headers.set('X-Debug-Version', debugVersion);
    if (import.meta.env.PROD) {
      response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    }
    return response;
  };

  const needsAuth =
    !AUTH_EXEMPT_PATHS.includes(url.pathname) &&
    PROTECTED_PREFIXES.some((path) => url.pathname.startsWith(path));

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
