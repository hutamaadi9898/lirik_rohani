import type { MiddlewareHandler } from 'astro';
import { readBearer } from './lib/adminAuth';

const PROTECTED_PREFIXES = ['/api/admin'];

export const onRequest: MiddlewareHandler = async (context, next) => {
  const url = new URL(context.request.url);

  const applySecurityHeaders = (response: Response) => {
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'same-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
    if (import.meta.env.PROD) {
      response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
    }
    return response;
  };

  const needsAuth = PROTECTED_PREFIXES.some((path) => url.pathname.startsWith(path));

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

  const response = await next();
  return applySecurityHeaders(response);
};
